# Copyright (c) 1997 James Clark
# See the file COPYING for copying permission.

# XmlOutput message definitions
=100
W1+sdataEntityReference++reference to internal SDATA entity %1 not allowed in XML
E1+externalDataEntityReference++reference to external data entity %1 not allowed in XML
W1+subdocEntityReference++reference to subdocument entity %1 not allowed in XML
W0+piQuestionLt++processing instruction containing "?>" not allowed in XML
W0+piNoName++XML requires processing instructions to start with a name
W1+externalDataNdata++external data entity %1 is CDATA or SDATA, but XML allows only NDATA
W1+notationAttributes++attributes were defined for notation %1; not allowed in XML
W1+cannotConvertFsiToUrl++cannot convert formal system identifier %1 to URL
W1+cannotOpenOutputFile++cannot open output file %1
W1+missingSystemId++missing system ID for entity %1
W1+unexpectedEntityType++unexpected entity type for entity named %1
W1+cannotCreateDirectory++cannot create directory %1
W1+tooManyOutputFiles++already wrote 99 versions of %1; will not overwrite
W1+alreadyWroteOutputFile++already wrote output file %1; will not overwrite
W1+removingLeadingSlashes++removing leading slashes from output filename %1
W1+pathOutsideOutputDirectory++path %1 outside output directory

