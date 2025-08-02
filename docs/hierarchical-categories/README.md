# Hierarchical Categories Documentation

**Author:** johnn27 (community contributor)  
**Related PR:** [#5268 - Introduce Hierarchical Category Groups](https://github.com/actualbudget/actual/pull/5268)  
**Related Issue:** [#1320 - Add subcategory](https://github.com/actualbudget/actual/issues/1320) (206+ upvotes)

## Overview

This documentation package provides comprehensive research, analysis, and implementation planning for hierarchical categories in Actual Budget. The proposal addresses strong user demand (206+ GitHub reactions) and significant competitive opportunities in the personal finance space.

## Document Structure

### 📋 [Implementation Specification](implementation-spec.md)
**Primary document** - 3-phase incremental development plan with technical details, timelines, and success criteria.

### 📊 [Competitive Research](competitive-research.md) 
Market analysis of personal finance apps (PocketSmith, YNAB, Credit Karma) showing user demand and implementation patterns.

### ⚠️ [Risk Analysis](risk-analysis.md)
Expert sub-agent reviews identifying risks around system complexity, user confusion, and competing organizational paradigms.

### 🔧 [Mixed Categories Approach](mixed-categories-approach.md)
Detailed technical proposal for flexible parent-child category budgeting with edge case analysis.

### 📖 [User Guide](user-guide.md)
Non-technical overview for end users explaining benefits and usage patterns.

## Key Findings

### ✅ Strong Market Validation
- **206+ user reactions** on Issue #1320 requesting this feature
- **YNAB limitations**: Only 2-level hierarchy, users actively requesting more
- **Credit Karma downgrade**: Mint refugees need hierarchy functionality  
- **PocketSmith success**: Proven implementation patterns with unlimited nesting

### ⚠️ Identified Risks
- **Competing systems**: Category Groups vs Hierarchical Categories confusion
- **User complexity**: Advanced features may overwhelm casual users
- **Technical debt**: Additional maintenance burden for open source community

### 🎯 Recommended Approach
**3-Phase Incremental Implementation:**
1. **Visual Hierarchy Foundation** (2-3 weeks, LOW risk)
2. **Enhanced Creation UX** (2-3 weeks, MEDIUM risk)  
3. **Advanced Analytics** (3-4 weeks, MEDIUM-HIGH risk)

## Implementation Philosophy

**Container-based budgeting** (validated by PocketSmith success):
- Parent categories = organizational containers
- Child categories = actual budgeting targets
- Roll-up analytics = consolidated insights

This approach balances flexibility with simplicity while addressing real user organizational needs.

## Community Impact

### Competitive Advantages
- **vs YNAB**: Unlimited nesting (they have 2-level only)
- **vs Credit Karma**: Full hierarchy (they have none)  
- **vs PocketSmith**: Open source with same feature set
- **Open source positioning**: Modern alternative with advanced features

### Success Metrics
- User adoption rates for hierarchical categories
- Performance impact with complex category structures
- Community feedback and contribution levels
- Competitive positioning in personal finance space

## Next Steps

1. **Community review** of implementation specification
2. **Phase 1 development** - Visual hierarchy foundation
3. **User testing** and feedback incorporation
4. **Iterative development** of subsequent phases

---

*This documentation represents extensive research and analysis to ensure hierarchical categories deliver maximum value while minimizing risks to Actual Budget's core simplicity and reliability.*