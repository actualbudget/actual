name: Bug Report
description: File a bug report
labels: ["bug"]
body:
  - type: markdown
    id: intro-md
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!
        Please ensure you provide as much information as asked to better assist in confirming and identifying a fix for the bug report.
  - type: dropdown
    id: existing-issue
    attributes:
      label: "Verified issue does not already exist?"
      description: "Please search to see if an issue already exists for the bug you encountered."
      options:
        - "I have searched and found no existing issue"
    validations:
      required: true
  - type: textarea
    id: errors-received
    attributes:
      label: "What error did you receive?"
      description: "If you received an error, please provide as much information as possible."
    validations:
      required: true
  - type: textarea
    id: command-run
    attributes:
      label: "Steps to Reproduce"
      description: "Steps to reproduce the reported error."
      value: 
    validations:
      required: true  
  - type: textarea
    id: other
    attributes:
      label: "Other details or mentions"
      description: "Please provide any other details or worthy mentions around this issue report"
    validations:
      required: false
  - type: markdown
    id: env-info
    attributes:
      value: "## Environment Details"
  - type: dropdown
    id: host-detail
    attributes:
      label: "test"
      multiple: true
      options:
        - A
        - B
        - C
        - D
        - E
    validations:
      required: true
  - type: textarea
    id: os-version
    attributes:
      label: "What Operating System are you using"
      description: ""
    validations:
      required: true
  
  
