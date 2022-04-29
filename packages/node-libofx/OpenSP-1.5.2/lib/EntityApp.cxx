// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "EntityApp.h"
#include "sptchar.h"

#include <stdlib.h>

#include "PosixStorage.h"
#ifdef SP_WININET
#include "WinInetStorage.h"
#else
#include "URLStorage.h"
#endif
#include "LiteralStorage.h"
#include "NotationStorage.h"
#include "ExtendEntityManager.h"
#include "SOEntityCatalog.h"
#include "CodingSystem.h"
#include "macros.h"
#include "EntityAppMessages.h"

#ifndef SGML_SEARCH_PATH_DEFAULT
#define SGML_SEARCH_PATH_DEFAULT SP_T("")
#endif

#ifndef SGML_CATALOG_FILES_DEFAULT
#define SGML_CATALOG_FILES_DEFAULT SP_T("")
#endif /* not SGML_CATALOG_FILES_DEFAULT */

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

const Char FILE_SEP = PATH_SEPARATOR;

EntityApp::EntityApp(const char *requiredInternalCode)
: CmdLineApp(requiredInternalCode),
  mapCatalogDocument_(0),
  restrictFileReading_(0)
{
  registerOption('c', SP_T("catalog"), 
                 EntityAppMessages::sysid, EntityAppMessages::cHelp);
  registerOption('C', SP_T("catalogs"), EntityAppMessages::CHelp);
  registerOption('D', SP_T("directory"), 
                 EntityAppMessages::directory, EntityAppMessages::DHelp); 
  registerOption('R', SP_T("restricted"),
                 EntityAppMessages::RHelp);
}

void EntityApp::processOption(AppChar opt, const AppChar *arg)
{
  switch (opt) {
  case 'c':
    catalogSysids_.push_back(arg);
    break;
  case 'C':
    mapCatalogDocument_ = 1;
    break;
  case 'D':
    searchDirs_.push_back(arg);
    break;
  case 'R':
    restrictFileReading_ = 1;
    break;
  default:
    CmdLineApp::processOption(opt, arg);
    break;
  }
}

int EntityApp::processArguments(int argc, AppChar **argv)
{
  StringC sysid;
  if (!makeSystemId(argc, argv, sysid))
    return 1;
  return processSysid(sysid);
}

Boolean EntityApp::makeSystemId(int nFiles, AppChar *const *files,
					StringC &result)
{
  Vector<StringC> filenames(nFiles == 0 ? 1 : nFiles);
  int i;
  for (i = 0; i < nFiles; i++)
    filenames[i] = convertInput(tcscmp(files[i], SP_T("-")) == 0
				? SP_T("<OSFD>0")
				: files[i]);
  if (nFiles == 0)
    filenames[0] = convertInput(SP_T("<OSFD>0"));
  return entityManager()->mergeSystemIds(filenames,
					 mapCatalogDocument_,
					 systemCharset(),
					 *this,
					 result);
}


Ptr<ExtendEntityManager> &EntityApp::entityManager()
{
  if (!entityManager_.isNull())
    return entityManager_;
  PosixStorageManager *sm
    = new PosixStorageManager("OSFILE",
			      &systemCharset(),
#ifndef SP_WIDE_SYSTEM
			      codingSystem(),
#endif
			      5,
			      restrictFileReading_);
  size_t i;
  for (i = 0; i < searchDirs_.size(); i++)
    sm->addSearchDir(convertInput(searchDirs_[i]));
  {
    const AppChar *e = tgetenv(SP_T("SGML_SEARCH_PATH"));
    if (!e)
      e = SGML_SEARCH_PATH_DEFAULT;
    if (*e) {
      StringC str(convertInput(e));
      size_t i = 0;
      size_t start = 0;
      for (;;) {
	if (i == str.size() || str[i] == FILE_SEP) {
	  sm->addSearchDir(StringC(str.data() + start,
				   i - start));
	  if (i == str.size())
	    break;
	  start = ++i;
	}
	else
	  i++;
      }
    }
  }

  entityManager_ = ExtendEntityManager::make(sm,
					     codingSystem(),
					     inputCodingSystemKit(),
					     internalCharsetIsDocCharset_);
  entityManager_
  ->registerStorageManager(new PosixFdStorageManager("OSFD",
						     &systemCharset()));
#ifdef SP_WININET
  entityManager_->registerStorageManager(new WinInetStorageManager("URL"));
#else
  entityManager_->registerStorageManager(new URLStorageManager("URL"));
#endif
  entityManager_->registerStorageManager(new LiteralStorageManager("LITERAL"));
  entityManager_->registerStorageManager(new NotationStorageManager("CLSID"));
  entityManager_->registerStorageManager(new NotationStorageManager("MIMETYPE"));
  Vector<StringC> v;
  for (i = 0; i < catalogSysids_.size(); i++)
    // filenames specified on command-line must exist
    v.push_back(convertInput(catalogSysids_[i]));
  {
    const AppChar *e = tgetenv(SP_T("SGML_CATALOG_FILES"));
    if (!e)
      e = SGML_CATALOG_FILES_DEFAULT;
    if (*e) {
      StringC str(convertInput(e));
      size_t i = 0;
      size_t start = 0;
      for (;;) {
	if (i == str.size() || str[i] == FILE_SEP) {
	  v.push_back(StringC(str.data() + start,
			      i - start));
	  if (i == str.size())
	    break;
	  start = ++i;
	}
	else
	  i++;
      }
    }
  }
  const SP_TCHAR *useDocCatalogStr = tgetenv(SP_T("SP_USE_DOCUMENT_CATALOG"));
  Boolean useDocCatalog = true;
  if (useDocCatalogStr
      && (stringMatches(useDocCatalogStr, "NO")
          || stringMatches(useDocCatalogStr, "0")))
    useDocCatalog = false;
  entityManager_->setCatalogManager(SOCatalogManager::make(v,
							   catalogSysids_.size(),
							   &systemCharset(),
							   &systemCharset(),
							   useDocCatalog));
  return entityManager_;
}

#ifdef SP_NAMESPACE
}
#endif
