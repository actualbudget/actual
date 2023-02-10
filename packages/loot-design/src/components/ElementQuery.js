import lively from '@jlongster/lively';

function findMatch(element, sizes) {
  const rect = element.getBoundingClientRect();
  const matched = sizes.find(size => {
    return (
      (size.width != null && rect.width < size.width) ||
      (size.height != null && rect.height < size.height)
    );
  });

  return matched || sizes[sizes.length - 1];
}

// Component

function ElementQuery({ props: { children }, state: { matched }, inst }) {
  return children(matched, el => (inst.element = el));
}

export default lively(ElementQuery, {
  getInitialState() {
    return { matched: null };
  },
  componentDidMount({ inst, props, setState }) {
    inst.observer = new ResizeObserver(entries => {
      entries.forEach(entry => {
        setState({ matched: findMatch(inst.element, props.sizes) });
      });
    });

    inst.observer.observe(inst.element);
  },
  componentWillUnmount({ inst }) {
    inst.observer.disconnect();
  },
});
