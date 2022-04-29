// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "StorageManager.h"
#define DEFAULT_BLOCK_SIZE 1024

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

StorageObject::StorageObject()
{
}

StorageObject::~StorageObject()
{
}

void StorageObject::willNotRewind()
{
}

size_t StorageObject::getBlockSize() const
{
  return DEFAULT_BLOCK_SIZE;
}

StorageManager::StorageManager()
{
}

StorageManager::~StorageManager()
{
}

Boolean StorageManager::inheritable() const
{
  return 1;
}

Boolean StorageManager::resolveRelative(const StringC &, StringC &,
					Boolean) const
{
  return 1;
}

Boolean StorageManager::guessIsId(const StringC &, const CharsetInfo &) const
{
  return 0;
}

Boolean StorageManager::transformNeutral(StringC &, Boolean, Messenger &) const
{
  return 0;
}

const InputCodingSystem *StorageManager::requiredCodingSystem() const
{
  return 0;
}

Boolean StorageManager::requiresCr() const
{
  return 0;
}

const CharsetInfo *StorageManager::idCharset() const
{
  return 0;
}

const StringC *StorageManager::reString() const
{
  return 0;
}

IdStorageManager::IdStorageManager(const CharsetInfo *idCharset)
: idCharset_(idCharset)
{
}

const CharsetInfo *IdStorageManager::idCharset() const
{
  return idCharset_;
}

const StringC *IdStorageManager::reString() const
{
  return &reString_;
}


#ifdef SP_NAMESPACE
}
#endif
