import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';

import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';

import BudgetCategories from './tutorial/BudgetCategories';
import BudgetInitial from './tutorial/BudgetInitial';
import BudgetNewIncome from './tutorial/BudgetNewIncome';
import BudgetNextMonth from './tutorial/BudgetNextMonth';
import BudgetSummary from './tutorial/BudgetSummary';
import CategoryBalance from './tutorial/CategoryBalance';
import Final from './tutorial/Final';
import Intro from './tutorial/Intro';
import Overspending from './tutorial/Overspending';
import TransactionAdd from './tutorial/TransactionAdd';
import TransactionEnter from './tutorial/TransactionEnter';

function generatePath(innerRect, outerRect) {
  const i = innerRect;
  const o = outerRect;
  // prettier-ignore
  return `
    M0,0 ${o.width},0 ${o.width},${o.height} L0,${o.height} L0,0 Z
    M${i.left},${i.top} L${i.left+i.width},${i.top} L${i.left+i.width},${i.top+i.height} L${i.left},${i.top+i.height} L${i.left},${i.top} Z
  `;
}

function expandRect({ top, left, width, height }, padding) {
  if (typeof padding === 'number') {
    return {
      top: top - padding,
      left: left - padding,
      width: width + padding * 2,
      height: height + padding * 2
    };
  } else if (padding) {
    return {
      top: top - (padding.top || 0),
      left: left - (padding.left || 0),
      width: width + (padding.right || 0) + (padding.left || 0),
      height: height + (padding.bottom || 0) + (padding.top || 0)
    };
  }

  return { top, left, width, height };
}

function withinWindow(rect) {
  return {
    top: rect.top,
    left: rect.left,
    width: Math.min(rect.left + rect.width, window.innerWidth) - rect.left,
    height: Math.min(rect.top + rect.height, window.innerHeight) - rect.top
  };
}

class MeasureNodes extends React.Component {
  state = { measurements: null };

  componentDidMount() {
    window.addEventListener('resize', () => {
      setTimeout(() => this.updateMeasurements(true), 0);
    });
    this.updateMeasurements();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.nodes !== this.props.nodes) {
      this.updateMeasurements();
    }
  }

  updateMeasurements() {
    this.setState({
      measurements: this.props.nodes.map(node => node.getBoundingClientRect())
    });
  }

  render() {
    const { children } = this.props;
    const { measurements } = this.state;
    return measurements ? children(...measurements) : null;
  }
}

class Tutorial extends React.Component {
  state = { highlightRect: null, windowRect: null };

  static contextTypes = {
    getTutorialNode: PropTypes.func,
    endTutorial: PropTypes.func
  };

  onClose = didQuitEarly => {
    // The difference between these is `endTutorial` permanently
    // disable the tutorial. If the user walked all the way through
    // it, never show it to them again. Otherwise they will see if
    // again if they create a new budget.
    if (didQuitEarly) {
      this.props.closeTutorial();
    } else {
      this.props.endTutorial();
    }
  };

  getContent(stage, targetRect, navigationProps) {
    switch (stage) {
      case 'budget-summary':
        return (
          <BudgetSummary
            fromYNAB={this.props.fromYNAB}
            targetRect={targetRect}
            navigationProps={navigationProps}
          />
        );
      case 'budget-categories':
        return (
          <BudgetCategories
            targetRect={targetRect}
            navigationProps={navigationProps}
          />
        );
      case 'transaction-add':
        return (
          <TransactionAdd
            targetRect={targetRect}
            navigationProps={navigationProps}
          />
        );
      case 'budget-new-income':
        return (
          <BudgetNewIncome
            targetRect={targetRect}
            navigationProps={navigationProps}
          />
        );
      case 'budget-next-month':
        return <div>hi</div>;
      default:
        throw new Error(
          `Encountered an unexpected error rendering the tutorial content for ${stage}`
        );
    }
  }

  render() {
    const { stage, fromYNAB, nextTutorialStage, closeTutorial } = this.props;
    if (stage === null) {
      return null;
    }

    const navigationProps = {
      nextTutorialStage: this.props.nextTutorialStage,
      previousTutorialStage: this.props.previousTutorialStage,
      closeTutorial: () => this.onClose(true),
      endTutorial: () => this.onClose(false)
    };

    switch (stage) {
      case 'intro':
        return (
          <Intro
            nextTutorialStage={nextTutorialStage}
            closeTutorial={closeTutorial}
            fromYNAB={fromYNAB}
          />
        );
      case 'budget-initial':
        return (
          <BudgetInitial
            nextTutorialStage={nextTutorialStage}
            closeTutorial={closeTutorial}
            navigationProps={navigationProps}
          />
        );
      case 'budget-next-month':
        return (
          <BudgetNextMonth
            nextTutorialStage={nextTutorialStage}
            closeTutorial={closeTutorial}
            navigationProps={navigationProps}
          />
        );
      case 'budget-next-month2':
        return (
          <BudgetNextMonth
            nextTutorialStage={nextTutorialStage}
            closeTutorial={closeTutorial}
            navigationProps={navigationProps}
            stepTwo={true}
          />
        );
      case 'transaction-enter':
        return (
          <TransactionEnter
            fromYNAB={fromYNAB}
            navigationProps={navigationProps}
          />
        );
      case 'budget-category-balance':
        return <CategoryBalance navigationProps={navigationProps} />;
      case 'budget-overspending':
        return <Overspending navigationProps={navigationProps} />;
      case 'budget-overspending2':
        return (
          <Overspending navigationProps={navigationProps} stepTwo={true} />
        );
      case 'final':
        return (
          <Final
            nextTutorialStage={nextTutorialStage}
            closeTutorial={closeTutorial}
            navigationProps={navigationProps}
          />
        );
      default:
      // Default case defined below (outside the switch statement)
    }

    const { node: targetNode, expand } = this.context.getTutorialNode(stage);

    return (
      <MeasureNodes nodes={[targetNode.parentNode, document.body]}>
        {(targetRect, windowRect) => {
          targetRect = withinWindow(
            expandRect(expandRect(targetRect, 5), expand)
          );

          return (
            <div>
              {ReactDOM.createPortal(
                <svg
                  width={windowRect.width}
                  height={windowRect.height}
                  viewBox={'0 0 ' + windowRect.width + ' ' + windowRect.height}
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1000,
                    pointerEvents: 'none'
                  }}
                >
                  <path
                    fill="rgba(0, 0, 0, .2)"
                    fill-rule="evenodd"
                    d={generatePath(targetRect, windowRect)}
                    style={{ pointerEvents: 'fill' }}
                  />
                </svg>,
                document.body
              )}
              {this.getContent(stage, targetRect, navigationProps)}
            </div>
          );
        }}
      </MeasureNodes>
    );
  }
}

export default connect(
  state => ({
    stage: state.tutorial.stage,
    fromYNAB: state.tutorial.fromYNAB
  }),
  dispatch => bindActionCreators(actions, dispatch)
)(Tutorial);
