// Global values provided via the API
declare var looker: Looker

import * as d3 from 'd3'
import { handleErrors } from './utils'

import { Row, Looker, Link, Cell, LookerChartUtils, VisualizationDefinition } from './types'
declare var LookerCharts: LookerChartUtils

interface CollapsibleTreeVisualization extends VisualizationDefinition {
  svg?: any
}

function descend(obj: any, taxonomy: any[], depth: number = 0) {
  const arr: any[] = []
  for (const k in obj) {
    if (k === '__data') {
      continue
    }
    const child: any = {
      name: k,
      depth,
      children: descend(obj[k], taxonomy, depth + 1),
    }
    if ('__data' in obj[k]) {
      child.data = obj[k].__data
    }
    arr.push(child)
  }
  return arr
}

function burrow(table: any, taxonomy: any[], linkMap: Map<string, Cell | Link[] | undefined>, root_node_name: string) {
  // create nested object
  const obj: any = {}
  // console.log('Log table: ', table)
  // console.log('Log taxonomy: ', taxonomy)

  table.forEach((row: Row) => {
    // start at root
    let layer = obj
    // create children as nested objects
    taxonomy.forEach((t: any) => {
      const key = row[t.name].value
      linkMap.set(key, row[t.name].links)
      layer[key] = key in layer ? layer[key] : {}
      layer = layer[key]
    })
    layer.__data = row
  })

  return {
    name: root_node_name,
    // name: 'root',
    children: descend(obj, taxonomy, 1),
    depth: 0,
    links: linkMap,
  }
}

const vis: CollapsibleTreeVisualization = {
  id: 'collapsible_tree', // id/label not required, but nice for testing and keeping manifests in sync
  label: 'Collapsible Tree',
  options: {
    // These are options that appear in the "Edit" panel of the visualization. 
    color_with_children: {
      label: 'Node Color With Children',
      default: '#36c1b3',
      type: 'string',
      display: 'color',
    },
    color_empty: {
      label: 'Empty Node Color',
      default: '#fff',
      type: 'string',
      display: 'color',
    },
    top_node_name: {
      label: 'Top Node Label',
      default: 'Top Level',
      type: 'string',
      display: 'text'
    },
    rect_height: {
      label: 'Box Height',
      default: 30,
      type: 'number',
      display: 'text'
    },
    rect_width: {
      label: 'Box Width',
      default: 60,
      type: 'number',
      display: 'text'
    },
    rect_distance: {
      label: 'Box Distance',
      default: 45,
      type: 'number',
      display: 'text'
    },
    text_size: {
      label: 'Text Size',
      default: 10,
      type: 'number',
      display: 'text'
    }
  },

  // Set up the initial state of the visualization
  create(element, config) {
    console.log('Set up the initial state of the visualization')
    this.svg = d3.select(element).append('svg')
  },
  
  // Render in response to the data or settings changing
  updateAsync(data, element, config, queryResponse, details, done) {
    var firstPass = 1
    console.log('Top Update of viz')
    console.log('Log queryResponse: ', queryResponse)
    console.log('Log data: ', data)
    console.log('Log details:', details)
    if (
      !handleErrors(this, queryResponse, {
        // defining the number of dimensions, measures that the viz will accept. An error will be shown to the user if outside the bounds indicated below
        min_pivots: 0,
        max_pivots: 0,
        min_dimensions: 2,
        max_dimensions: 5,
        min_measures: 0,
        max_measures: undefined,
      })
    )
      return

    let i = 0
    const nodeColors = {
      children: (config && config.color_with_children) || this.options.color_with_children.default,
      empty: (config && config.color_empty) || this.options.color_empty.default,
    }

    // Changing circles to rectangles
    const rectW = (config && config.rect_width) || this.options.rect_width.default
    const rectH = (config && config.rect_height) || this.options.rect_height.default
    const rectdist = (config && config.rect_distance) || this.options.rect_distance.default

    const textSize = (config && config.text_size) || this.options.text_size.default

    const duration = 750
    const margin = { top: 10, right: 10, bottom: 10, left: 10 }
    const width = element.clientWidth - margin.left - margin.right
    const height = element.clientHeight - margin.top - margin.bottom
    const linkMap: Map<string, Link[]> = new Map()
    const nested = burrow(data, queryResponse.fields.dimension_like, linkMap, config.top_node_name)

    const svg = this.svg!.html('')
      .attr('width', width + margin.right + margin.left)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

    // declares a tree layout and assigns the size
    const treelayout = d3.tree().size([width, height])

    // Assigns parent, children, height, depth
    const rootNode: any = d3.hierarchy(nested, (d) => d.children)
    rootNode.x0 = 0
    rootNode.y0 = width / 2

    // define some helper functions that close over our local variables

    // Collapse the node and all it's children
    function collapse(d: any) {
      if (d.children) {
        d._children = d.children
        d._children.forEach(collapse)
        d.children = null
      }
    }

    // Creates a curved (diagonal) path from parent to the child nodes
    function diagonal(s: any, d: any) {
      const path = `
        M ${s.x + rectW/2} ${s.y}
        C ${s.x + rectW/2} ${(s.y + d.y + rectH)/2},
          ${d.x + rectW/2} ${(d.y + d.y + rectH)/2},
          ${d.x + rectW/2} ${d.y + rectH}
      `.trim()
      return path
    }

    // Toggle children on click on RECT
    function click(d: any) {
      if (d.children) {
        d._children = d.children
        d.children = null
      } else {
        d.children = d._children
        d._children = null
      }
      update(d)
    }

    // Launch the LookerUtil on User Click on Text 
    function layerdrill(event: any, d:any, _row: any ){
      
      // Process User Click Event on Text
      if (details?.crossfilterEnabled) {
        LookerCharts.Utils.toggleCrossfilter({row: _row , event: event})
        // console.log('toggleCrossfilter Pressed', _row, event)
      }
      else if (event.altKey) {
        // console.log('Alt key was pressed, setup CrossFilter')
      }
      else {
        // console.log('Crossfilters Not Enabled') 
      }
      return
    }

    // Update the display for a given node
    function update(source: any) {

      // Assigns the x and y position for the nodes
      const treeData = treelayout(rootNode)

      // Compute the new tree layout.
      const nodes = treeData.descendants()
      const links = treeData.descendants().slice(1)

      // Normalize for fixed-depth.
      nodes.forEach((d) => {
        d.y = d.depth * rectdist
      })

      // tooltip definition
      var tooltip = d3.select('body')
        .append('div')
        .style('position', 'absolute')
        .style('z-index', '10')
        .style('visibility', 'hidden')
        .style('background', 'gray')
        .style('opacity', .8)
        .style('height', rectH + 'px')
        .style('width', rectW + 'px')
        .style('overflow-wrap', 'break-word')
        .style('font-family', "'Open Sans', Helvetica, sans-serif")
        .style('font-size', textSize + 'px')
        .text('a simple tooltip')


      // ****************** Nodes section ***************************

      // Update the nodes...
      const node = svg.selectAll('g.node').data(nodes, (d: any) => d.id || (d.id = ++i))

      // Enter any new modes at the parent's previous position.
      const nodeEnter = node
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', (d: any) => {
          return 'translate(' + (source.x0) + ',' + source.y0 + ')'
        })
      
      // [WIP] Adding a Rectangle
      nodeEnter
          .append('rect')
          .attr('class', 'node')
          .attr('width', rectW)
          .attr('height', rectH)
          .attr('stroke', 'black')
          .on('click', (event:any, d:any) => {
            click(d)
          })
          .style('cursor', 'pointer')
          .style('fill',  (d: any) => {
            return d._children ? nodeColors.children : nodeColors.empty;
          })
          // tooltip functionality
          .on('mouseover', (event:any, d:any )=>{
            tooltip.text(d.data.name)
            return tooltip.style('visibility', 'visible')
          })
          .on('mousemove', (event:any, d:any )=>{
            return tooltip.style('top', (event.pageY-10)+'px').style('left', (event.pageX+10)+'px')
          })
          .on('mouseout', (event:any, d:any )=>{
            return tooltip.style('visibility', 'hidden')
          })

      // Add labels for the nodes
      nodeEnter
        .append('text')
        .attr('class', 'node-text')
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .attr('y', rectH / 2)
        .attr('x', rectW / 2)
        .attr('text-color', 'gray')
        .style('cursor', 'pointer')
        .style('font-family', "'Open Sans', Helvetica, sans-serif")
        .style('font-size', textSize + 'px')
        .style('overflow-wrap', 'break-word')
        .text((d: any) => {
          return d.data.name
        })
        // .on('click', (event: any, d: any) => {
        //   const vizDimensions = queryResponse.fields.dimension_like
        //   console.log('Log vizDimensions', vizDimensions[d.data.depth-1].name)
        //   let _row = {[vizDimensions[d.data.depth-1].name]: { value: [d.data.name]}}
        //   console.log('Echo _row: ', _row)
        //   return layerdrill(event, d, _row)
          
        // })
    
        
      // UPDATE
      const nodeUpdate = nodeEnter.merge(node)

      // Transition to the proper position for the node
      nodeUpdate
        .transition()
        .duration(duration)
        .attr('transform', (d: any) => {
          return 'translate(' + d.x + ',' + d.y + ')'
        })

      // Update the node attributes and style
      nodeUpdate
        .select('rect.node')
        .style('fill', (d: any) => (d._children ? nodeColors.children : nodeColors.empty))
        .style('stroke', 'black')
        .style('stroke-width', 1.5)
        .attr('cursor', 'pointer')
        // console.log('NodeUpdate Step Rect')
      
      nodeUpdate
        .select('text.node-text')
        .on('click', (event: any, d: any) => {
          const localevent: object = { pageX: event.pageX, pageY: event.pageY }
          const vizDimensions = queryResponse.fields.dimension_like
          let _row = {[vizDimensions[d.data.depth-1].name]: { value: [d.data.name]}}
          layerdrill(localevent, d, _row)
        })
        
      // Remove any exiting nodes
      const nodeExit = node
        .exit()
        .transition()
        .duration(duration)
        .attr('transform', (d: any) => {
          return 'translate(' + source.x + ',' + source.y + ')'
        })
        .remove()
      
    
      // On exit reduce the node circles size to 0
      nodeExit.select('rect').remove()

      // On exit reduce the opacity of text labels
      nodeExit.select('text').style('fill-opacity', 1e-6)
      
      // ****************** links section ***************************

      // Update the links...
      const link = svg.selectAll('path.link').data(links, (d: any) => d.id)

      // Enter any new links at the parent's previous position.
      const linkEnter = link
        .enter()
        .insert('path', 'g')
        .attr('class', 'link')
        .style('fill', 'none')
        .style('stroke', '#ddd')
        .style('stroke-width', 1.5)
        .attr('d', (d: any) => {
          const o = { x: source.x0, y: source.y0 }
          return diagonal(o, o)
        })

      // UPDATE
      const linkUpdate = linkEnter.merge(link)
      
      // Transition back to the parent element position
      linkUpdate
        .transition()
        .duration(duration)
        .attr('d', (d: any) => diagonal(d, d.parent))

      // Remove any exiting links
      link
        .exit()
        .transition()
        .duration(duration)
        .attr('d', (d: any) => {
          const o = { x: source.x, y: source.y }
          return diagonal(o, o)
        })
        .remove()

      // Store the old positions for transition.
      nodes.forEach((d: any) => {
        d.x0 = d.x
        d.y0 = d.y
      })
      
      // return
      done()
    }

    // Collapse after the second level
    rootNode.children.forEach(collapse)

    // Update the root node
    update(rootNode)
    
    done()
  }
}

looker.plugins.visualizations.add(vis)
