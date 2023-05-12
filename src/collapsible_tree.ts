// Global values provided via the API
declare var looker: Looker

import * as d3 from 'd3'
import { handleErrors } from './utils'

import { Row, Looker, Link, Cell, LookerChartUtils, VisualizationDefinition } from './types'
import { callbackify } from 'util'
// import { getEventListeners } from 'events'
// import { type } from 'os'
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
    }
  },

  // Set up the initial state of the visualization
  create(element, config) {
    this.svg = d3.select(element).append('svg')
  },

  // Render in response to the data or settings changing
  update(data, element, config, queryResponse) {
    if (
      !handleErrors(this, queryResponse, {
        min_pivots: 0,
        max_pivots: 0,
        min_dimensions: 2,
        max_dimensions: undefined,
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
    var rectW = 60
    var rectH = 30

    const textSize = 10
    const nodeRadius = 4
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
    // const treelayout = d3.tree().size([height, width])
    const treelayout = d3.tree().size([width, height])
    // Assigns parent, children, height, depth

    const rootNode: any = d3.hierarchy(nested, (d) => d.children)
    // rootNode.x0 = height / 2
    // rootNode.y0 = 0
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

    // Toggle children on click.
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

    function clickHandler(element: HTMLElement) {
      element.addEventListener('click', () => {
        
      })
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
        d.y = d.depth * 90
        // d.x = d.depth * 180
      })

      // ****************** Nodes section ***************************

      // Update the nodes...
      const node = svg.selectAll('g.node').data(nodes, (d: any) => d.id || (d.id = ++i))

      // Enter any new modes at the parent's previous position.
      const nodeEnter = node
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', (d: any) => {
          return 'translate(' + (source.x0 + rectW/2) + ',' + source.y0 + ')'
          // return 'translate(' + source.y0 + ',' + source.x0 + ')'
        })

      // Add Circle for the nodes
      // nodeEnter.append('circle').attr('class', 'node').attr('r', 1e-6).on('click', click)
      
      // [WIP] Adding a Rectangle
      nodeEnter
          .append('rect')
          .attr('width', rectW)
          .attr('height', rectH)
          .attr('stroke', 'black')
          .attr('stroke-width', 1)
          .on('click', click)
          // .addEventListener('click', click)
          .style('cursor', 'pointer')
          .style('fill',  (d: any) => {
            return d._children ? nodeColors.children : nodeColors.empty;
          });

      // Add labels for the nodes
      nodeEnter
        .append('text')
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .attr('y', rectH / 2)
        .attr('x', rectW / 2)
        // .attr('x', (d: any) => {
        //   return d.children || d._children ? -textSize : textSize
        // })
        // .attr('text-anchor', (d: any) => {
        //   return d.children || d._children ? 'end' : 'start'
        // })
        .style('cursor', 'pointer')
        .style('font-family', "'Open Sans', Helvetica, sans-serif")
        .style('font-size', textSize + 'px')
        .text((d: any) => {
          return d.data.name
        })
        // .addEventListener('click', (d: any) => {
        //   const event: object = { pageX: d.x, pageY: d.y }
        //   LookerCharts.Utils.openDrillMenu({
        //     links: linkMap.get(d.data.name),
        //     event: event,
        //   })
        // })
        

      // UPDATE
      const nodeUpdate = nodeEnter.merge(node)

      // Transition to the proper position for the node
      nodeUpdate
        .transition()
        .duration(duration)
        .attr('transform', (d: any) => {
          return 'translate(' + d.x + ',' + d.y + ')'
          // return 'translate(' + d.y + ',' + d.x + ')'
        })

      // Update the node attributes and style
      nodeUpdate
        .select('rect.node')
        // .attr('r', nodeRadius)
        .style('fill', (d: any) => (d._children ? nodeColors.children : nodeColors.empty))
        .style('stroke', nodeColors.children)
        .style('stroke-width', 1.5)
        .attr('cursor', 'pointer')

      // Remove any exiting nodes
      const nodeExit = node
        .exit()
        .transition()
        .duration(duration)
        .attr('transform', (d: any) => {
          return 'translate(' + source.x + ',' + source.y + ')'
          // return 'translate(' + source.y + ',' + source.x + ')'
        })
        .remove()

      // On exit reduce the node circles size to 0
      // nodeExit.select('circle').attr('r', 1e-6)

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
    }

    // Collapse after the second level
    rootNode.children.forEach(collapse)

    // Update the root node
    update(rootNode)
  },
}

looker.plugins.visualizations.add(vis)
