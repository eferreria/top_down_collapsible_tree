# Top Down Collapsible Tree - Org Chart

This diagram displays a [treemap](https://en.wikipedia.org/wiki/Tree_structure), showing a hierarchy of a series of dimensions. This custom visualization is based on the [Collapsible Tree Custom Visualization](https://github.com/looker-open-source/custom_visualizations_v2/tree/master/src/examples/collapsible_tree)

**How it works**

Create a Look with two or more dimensions.

For example, in the collapsible tree diagram featured above, you can see the nested relationship between department, category and brand in an ecommerce catalog.

**More Info**

The minimum requirement for this visualization to work is two dimensions.

The collapsible tree map is best utilized for cases where the user wants to map a lineage of high level to granular data. Visualization will start with one “Top Level” or root node (0), and split off into a number of nested the the number of unique records from the first (furthest left) dimension in the explore, each represented by a new node (1).

All subnodes will be collapsed by default and can be expanded by clicking.

**Looker Visualization: CrossFilters**
The specific goal of this custom visualization are:
<ul>
    <li> Top Down Tree </li>
    <li> CrossFilter Feature </li>
</ul>

**Top Down Tree**
In order to flip the original collapsible tree, the transform d3 functions will need to have its arguments flipped (x->y, y->x). The event handlers have changed in d3v6 and this needed to be updated in the code.

**CrossFilter Feature**
In order to enable crossfilter functionality, the custom visualization needs to check the values sent to the custom viz via the "details". Sending the "details" to the console, will allow you to review and develop the correct functionality for the crossfilters. Note that this will be different depending on how you are shaping the data in the viz.

For this particular viz, we have added the following lines of code in the type.ts

toggleCrossfilter - this takes a json object, for this particular vis, we are sending a { dimension_name: dimension_value }
``` 
export interface LookerChartUtils {
  Utils: {
  ...
    toggleCrossfilter: (props: any) => void
    }
```

crossfilterEnabled - this adds the ability for us to check if the dashboard has crossfiltersEnabled. This will be used to logically branch what the viz will do depending on the value
```
export interface VisUpdateDetails {
  changed: {
    ...
  }
  crossfilterEnabled: boolean
}
```

**What's Next and Developer Notes**
As of May 2023, this visualization still has some buggy functionality that haven't been addressed (it wasn't the focus). Please be aware if you will use this that these issues still exist
* Tooltip can stay active/visible when clicking on a rect object
* DrillMenu is not enabled - you can add the LookerChart.Utils.OpenDrillMenu on the click handler, but this wasn't implement due to the next issue
* Node state is not saved when a click is registered for crossFilters - the node resets, or in other words the updateAsync call is called again which rerenders the object. This would be ok if the state is conserved but I wasn't able to fix this at this time.

#### Quickstart Dev Instructions

1.  **Install Dependecies.**

    Using yarn, install all dependencies

    ```
    yarn
    ```

2.  **Run https dev server**

    To run a local server to serve your compiled .js code:

    ```
    yarn serve
    ```

3.  **Make changes to your code**

    Webpack dev server will automatically detect changes and recompile js into the /dist folder

**`org_tree.js`**: This visualization's minified distribution file.

**`manifest.lkml`**: Looker's external dependencies configuration file. The visualization object is defined here. Note that this depends on the .js file to be imported as a file in the LookML Model

**`/src`**: This directory will contain all of the visualization's source code.

**`/node_modules`**: The directory where all of the modules of code that your project depends on (npm packages) are automatically installed.

**`README.md`**: This! A text file containing useful reference information about this visualization.

**`yarn.lock`**: [Yarn](https://yarnpkg.com/) is a package manager alternative to npm. This file serves essentially the same purpose as `package-lock.json`, just for a different package management system.

**`.tsconfig.json`**: A configuration file for the typescript -> javascript compiler.
