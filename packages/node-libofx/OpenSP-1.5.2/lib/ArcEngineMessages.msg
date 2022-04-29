# Copyright (c) 1996 James Clark, 2000 Matthias Clasen
# See the file COPYING for copying permission.
# Format is+
# TN+tag+relevant clauses+message
# where T is a letter indicating the type, and N is the number of arguments.

=3000
E1+arcGenerateSystemId++no system identifier could be generated for meta-DTD for architecture %1
E1+undefinedElement++element type %1 not defined in meta-DTD
E1+elementExcluded++element %1 invalid in meta-DTD because excluded
E1+invalidElement++meta-DTD does not allow element %1 at this point
E1+documentElementNotArc++document element must be instance of %1 element type form
E1+unfinishedElement++element %1 unfinished in meta-DTD
E0+renameMissingAttName++missing substitute name
E1+renameToInvalid++substitute for non-existent architecture attribute %1
E1+renameToDuplicate++substitute name for %1 already defined
E1+renameFromInvalid++substitute name %1 is not the name of an attribute
X1+missingId++reference in architecture to non-existent ID %1
E0+invalidArcContent++architectural content specified with #ARCCONT not allowed by meta-DTD
E1+invalidSuppress+ISO/IEC 10744:1997 A3.5.3+invalid value %1 for ArcSupr attribute
E1+arcDtdNotDeclaredParameter+ISO/IEC 10744:1997 A3.4.2+no declaration for meta-DTD parameter entity %1
E1+arcDtdNotDeclaredGeneral+ISO/IEC 10744:1997 A3.4.2+no declaration for meta-DTD general entity %1
E1+arcDtdNotExternal+ISO/IEC 10744:1997 A3.4.2+meta-DTD entity %1 must be external
W0+noArcDTDAtt+ISO/IEC 10744:1997 A3.4.2+no ArcDTD architecture support attribute specified
E1+noArcDataF+ISO/IEC 10744:1997 A3.4.2+ArcDataF notation %1 not defined in meta-DTD
E1+idMismatch+ISO/IEC 10744:1997 A3.6.4+ID attribute %1 in meta-DTD not declared as ID in DTD
E1+invalidArcAuto+ISO/IEC 10744:1997 A3.4.2+invalid value %1 for ArcAuto architectural support attribute
E1+noArcNotation+ISO/IEC 10744:1997 A3.4.1+no notation declaration for architecture %1
E0+invalidData++meta-DTD does not allow data at this point
E1+invalidIgnD+ISO/IEC 10744:1997 A3.5.4+invalid value %1 for ArcIgnD attribute
-E1+invalidArcIndr++invalid value %1 for ArcIndr architectural support attribute
E1+invalidQuantity++unrecognized quantity name %1
E1+missingQuantityValue++no value specified for quantity %1
E1+quantityValueTooLong++length of value %1 for quantity is too long
E1+invalidDigit++invalid digit %1
E0+arcIndrNotSupported++only value of nArcIndr for ArcIndr attribute supported
E0+arcContDuplicate+ISO/IEC 10744:1997 A3.5.2+#ARCCONT attribute already specified
E1+arcContInvalid+ISO/IEC 10744:1997 A3.5.2+invalid value %1 for #ARCCONT
E1+renameFromDuplicate+ISO/IEC 10744:1997 A3.5.2+%1 already used as a substitute name
E0+contentDuplicate+ISO/IEC 10744:1997 A3.5.2+substitute name #CONTENT already specified
E0+is10744PiKeywordMissing++IS10744 PI keyword missing
E1+is10744PiKeywordInvalid++invalid IS10744 PI keyword %1
E1+duplicateArcDecl++architecture %1 already defined+the first definition
W1+ignoringPiArcDecl++ignoring PI declaration of architecture %1+the ArcBase definition
W1+ignoringArcBaseArcDecl++ignoring ArcBase declaration of architecture %1+the PI definition
