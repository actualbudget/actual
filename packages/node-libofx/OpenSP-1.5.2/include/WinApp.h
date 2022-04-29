// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#ifndef WinApp_INCLUDED
#define WinApp_INCLUDED 1

#include "Event.h"
#include "Vector.h"
#include "StringC.h"
#include "CharsetInfo.h"
#include "ParserOptions.h"
#include "SgmlParser.h"
#include "Ptr.h"
#include "CodingSystemKit.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API WinApp {
public:
  WinApp();
  ParserOptions options;
  Boolean setEncoding(StringC &tem);
  const StringC &encoding() const;
  Boolean setDefaultEncoding(StringC &tem);
  const StringC &defaultEncoding() const;
  // These are semi-colon delimited lists of system identifiers.
  void setExtraCatalogs(StringC &tem);
  const StringC &extraCatalogs() const;
  void setDefaultCatalogs(StringC &tem);
  const StringC &defaultCatalogs() const;
  void setExtraDirectories(StringC &tem);
  const StringC &extraDirectories() const;
  void setDefaultDirectories(StringC &tem);
  const StringC &defaultDirectories() const;
  void initParser(const StringC &, SgmlParser &);
  void initParser(const StringC &sysid, SgmlParser &, Ptr<EntityManager> &);
private:
  static void setRegistry(const char *name, const StringC &value);
  static Boolean getRegistry(const char *name, StringC &value);
  const InputCodingSystem *getCodingSystem(const StringC &name);

  StringC extraCatalogs_;
  StringC defaultCatalogs_;
  StringC extraDirectories_;
  StringC defaultDirectories_;
  StringC encoding_;
  StringC defaultEncoding_;
  ConstPtr<InputCodingSystemKit> codingSystemKit_;
};

inline
const StringC &WinApp::encoding() const
{
  return encoding_;
}

inline
const StringC &WinApp::defaultEncoding() const
{
  return defaultEncoding_;
}

inline
const StringC &WinApp::extraCatalogs() const
{
  return extraCatalogs_;
}

inline
void WinApp::setExtraCatalogs(StringC &str)
{
  str.swap(extraCatalogs_);
}

inline
const StringC &WinApp::defaultCatalogs() const
{
  return defaultCatalogs_;
}

inline
const StringC &WinApp::extraDirectories() const
{
  return extraDirectories_;
}

inline
void WinApp::setExtraDirectories(StringC &str)
{
  str.swap(extraDirectories_);
}

inline
const StringC &WinApp::defaultDirectories() const
{
  return defaultDirectories_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not WinApp_INCLUDED */
