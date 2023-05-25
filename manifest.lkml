

constant: VIS_LABEL {
  value: "Org Chart"
  export: override_optional
}

constant: VIS_ID {
  value: "org-chart"
  export:  override_optional
}

visualization: {
  id: "@{VIS_ID}"
  file: "org_chart.js"
  label: "@{VIS_LABEL}"
}
