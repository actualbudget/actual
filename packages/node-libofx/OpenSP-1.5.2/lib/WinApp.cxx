// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#include "splib.h"

#ifdef SP_WIDE_SYSTEM

#include "WinApp.h"
#include "CodingSystemKit.h"
#include "Ptr.h"
#include "ExtendEntityManager.h"
#include "SOEntityCatalog.h"
#include "SgmlParser.h"
#include "PosixStorage.h"
#include "LiteralStorage.h"
#ifdef SP_WININET
#include "WinInetStorage.h"
#else
#include "URLStorage.h"
#endif
#define STRICT
#include <windows.h>
#include "macros.h"

#ifndef SP_DEFAULT_ENCODING
#define SP_DEFAULT_ENCODING "WINDOWS"
#endif

#ifndef SP_REGISTRY_KEY
#define SP_REGISTRY_KEY "Software\\James Clark\\SP"
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

static
StringC asStringC(const char *s)
{
  StringC tem;
  if (s) {
    while (*s)
      tem += (unsigned char)*s++;
  }
  return tem;
}

WinApp::WinApp()
{
  getRegistry("Catalogs", defaultCatalogs_);
  getRegistry("Directories", defaultDirectories_);
  getRegistry("Encoding", defaultEncoding_);
  if (defaultEncoding_.size() == 0 || !getCodingSystem(defaultEncoding_)) {
    defaultEncoding_ = asStringC(SP_DEFAULT_ENCODING);
  }
}

const InputCodingSystem *
WinApp::getCodingSystem(const StringC &name)
{
  if (name.size() == 0)
    return 0;
  if (codingSystemKit_.isNull())
    codingSystemKit_ = CodingSystemKit::make(0);
  const char *tem;
  return codingSystemKit_->makeInputCodingSystem(name,
						 codingSystemKit_->systemCharset(),
						 0,
						 tem);
}

static
void split(const StringC &str, Char sep, Vector<StringC> &result)
{
  Boolean started = 0;
  for (size_t i = 0; i < str.size(); i++) {
    if (str[i] == sep)
      started = 0;
    else {
      if (!started) {
	result.resize(result.size() + 1);
	started = 1;
      }
      result.back() += str[i];
    }
  }
}

void WinApp::initParser(const StringC &sysid, SgmlParser &parser)
{
  Ptr<EntityManager> em;
  initParser(sysid, parser, em);
}

void WinApp::initParser(const StringC &sysid, SgmlParser &parser,
			Ptr<EntityManager> &em)
{
  const InputCodingSystem *codingSystem = getCodingSystem(encoding_);
  if (!codingSystem)
    codingSystem = getCodingSystem(defaultEncoding_);
  ConstPtr<InputCodingSystemKit> icsk;
  icsk.swap(codingSystemKit_);
  const CharsetInfo *systemCharset = &icsk->systemCharset();

  PosixStorageManager *sm
    = new PosixStorageManager("OSFILE",
			      systemCharset,
			      5);
  {
    Vector<StringC> dirs;
    split(extraDirectories_, ';', dirs);
    split(defaultDirectories_, ';', dirs);
    for (size_t i = 0; i < dirs.size(); i++)
      sm->addSearchDir(dirs[i]);
  }
  ExtendEntityManager *xem
   = ExtendEntityManager::make(sm,
			       codingSystem,
			       icsk,
			       0);
  em = xem;
  xem
  ->registerStorageManager(new PosixFdStorageManager("OSFD",
						     systemCharset));
#ifdef SP_WININET
  xem->registerStorageManager(new WinInetStorageManager("URL"));
#else
  xem->registerStorageManager(new URLStorageManager("URL"));
#endif
  xem->registerStorageManager(new LiteralStorageManager("LITERAL"));
  Vector<StringC> catalogSysids;
  split(extraCatalogs_, ';', catalogSysids);
  size_t nExtra = catalogSysids.size();
  split(defaultCatalogs_, ';', catalogSysids);
  xem->setCatalogManager(SOCatalogManager::make(catalogSysids,
					        nExtra,
					        systemCharset,
					        systemCharset,
						1));
  SgmlParser::Params params;
  params.sysid = sysid;
  params.entityManager = em.pointer();
  params.options = &options;
  parser.init(params);
}

void WinApp::setDefaultCatalogs(StringC &tem)
{
  if (tem != defaultCatalogs_) {
    tem.swap(defaultCatalogs_);
    setRegistry("Catalogs", defaultCatalogs_);
  }
}

void WinApp::setDefaultDirectories(StringC &tem)
{
  if (tem != defaultDirectories_) {
    tem.swap(defaultDirectories_);
    setRegistry("Directories", defaultDirectories_);
  }
}

Boolean WinApp::setEncoding(StringC &str)
{
  if (!getCodingSystem(str))
    return 0;
  str.swap(encoding_);
  return 1;
}

Boolean WinApp::setDefaultEncoding(StringC &str)
{
  if (!getCodingSystem(str))
    return 0;
  str.swap(defaultEncoding_);
  setRegistry("Encoding", defaultEncoding_);
  return 1;
}

void WinApp::setRegistry(const char *name, const StringC &value)
{
  HKEY hk;
  if (RegCreateKeyA(HKEY_CURRENT_USER, SP_REGISTRY_KEY, &hk) != ERROR_SUCCESS)
    return;
  String<char> buf;
  String<wchar_t> valuew;
  for (size_t i = 0; i < value.size(); i++)
    valuew += wchar_t(value[i]);
  int len = WideCharToMultiByte(CP_ACP, 0, valuew.data(), valuew.size(), 0, 0, 0, 0);
  buf.resize(len + 1);
  WideCharToMultiByte(CP_ACP, 0, valuew.data(), valuew.size(), buf.begin(), len, 0, 0);
  buf[len] = '\0';
  RegSetValueA(hk, name, REG_SZ, buf.data(), len);
  RegCloseKey(hk);
}

Boolean WinApp::getRegistry(const char *name, StringC &value)
{
  HKEY hk;
  if (RegOpenKeyA(HKEY_CURRENT_USER, SP_REGISTRY_KEY, &hk) != ERROR_SUCCESS)
    return 0;
  String<char> buf;
  long size;
  Boolean retval = 0;
  if (RegQueryValueA(hk, name, 0, &size) == ERROR_SUCCESS) {
    buf.resize(size);
    if (RegQueryValueA(hk, name, &buf[0], &size) == ERROR_SUCCESS) {
      int nChars = MultiByteToWideChar(CP_ACP, 0, buf.data(), size - 1, 0, 0);
      if (nChars || GetLastError() == ERROR_SUCCESS) {
	value.resize(nChars);
	String<wchar_t> valuew;
	for (size_t i = 0; i < value.size(); i++)
	  valuew += wchar_t(value[i]);
	if (MultiByteToWideChar(CP_ACP, 0, buf.data(), size - 1, (wchar_t *)valuew.data(), nChars) == nChars)
	  retval = 1;
	else
	  value.resize(0);
      }
    }
  }
  RegCloseKey(hk);
  return retval;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* SP_WIDE_SYSTEM */
