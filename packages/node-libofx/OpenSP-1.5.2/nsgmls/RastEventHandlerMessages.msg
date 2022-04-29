# Copyright (c) 1994,1995 James Clark
# See the file COPYING for copying permission.

# RastEventHandler message definitions

=100
E0+invalidRastPiError++invalid RAST processing instruction
E1+invalidActiveLinkType++invalid link type %1 in rast-active-lpd processing instruction
E1+duplicateActiveLinkType++duplicate link type %1 in rast-active-lpd processing instruction
E0+multipleLinkRuleMatch++rast-link-rule: processing instruction matches more than one link rule
E0+noLinkRuleMatch++rast-link-rule: processing instruction does not match any link rules
E0+multipleLinkRules++multiple applicable link rules without disambiguating rast-link-rule: processing instruction
