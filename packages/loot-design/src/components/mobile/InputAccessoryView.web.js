import React from 'react';

class InputAccessoryView extends React.Component {
  componentDidMount() {
    // The purpose of this component is to never steal away focus from
    // inputs by interacting with anything inside of here. The way we
    // do that is by watching everything inside a design section and
    // keeping track of which input is focused.
    //
    // Then we watch for anything getting focus inside of this
    // accessory view and immediately re-focus the input if there was
    // on focused.

    // Walk up the DOM and find the containing section node
    let section = null;
    let current = this.el;
    while (current) {
      if (current.dataset && current.dataset.section) {
        section = current;
        break;
      }

      current = current.parentNode;
    }

    // If we aren't in a section for some reason, do nothing
    if (!section) {
      return;
    }

    // Watch for all focus events inside a section, and keep the last
    // focused input
    this.el.addEventListener(
      'focusin',
      ev => {
        if (ev.relatedTarget && ev.relatedTarget.tagName === 'INPUT') {
          ev.relatedTarget.focus();
        }
      },
      true
    );
  }

  render() {
    return (
      <div style={{ overflow: 'hidden' }} ref={el => (this.el = el)}>
        {this.props.children}
      </div>
    );
  }
}

export default InputAccessoryView;
