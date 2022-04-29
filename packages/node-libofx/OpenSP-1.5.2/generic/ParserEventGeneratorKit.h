// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifndef ParserEventGeneratorKit_INCLUDED
#define ParserEventGeneratorKit_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "EventGenerator.h"

class ParserEventGeneratorKitImpl;

class SP_API ParserEventGeneratorKit {
public:
  ParserEventGeneratorKit();
  ~ParserEventGeneratorKit();
  enum Option {
    showOpenEntities,
    showOpenElements,
    outputCommentDecls,
    outputMarkedSections,
    outputGeneralEntities,
    mapCatalogDocument,
    restrictFileReading,
    showErrorNumbers
  };
  enum OptionWithArg {
    addCatalog,
    includeParam,
    enableWarning,
    addSearchDir,
    activateLink,
    architecture		// not implemented
    };
  void setOption(Option);
#ifdef SP_WIDE_SYSTEM
  void setProgramName(const wchar_t *);
  void setOption(OptionWithArg, const wchar_t *);
  EventGenerator *makeEventGenerator(int nFiles, wchar_t *const *files);
#else
  void setProgramName(const char *);
  void setOption(OptionWithArg, const char *);
  EventGenerator *makeEventGenerator(int nFiles, char *const *files);
#endif
private:
  ParserEventGeneratorKit(const ParserEventGeneratorKit &); // undefined
  void operator=(const ParserEventGeneratorKit &);   // undefined

  ParserEventGeneratorKitImpl *impl_;
};

#endif /* not ParserEventGeneratorKit_INCLUDED */
