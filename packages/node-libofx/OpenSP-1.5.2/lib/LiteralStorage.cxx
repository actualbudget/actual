// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "LiteralStorage.h"
#include "CodingSystem.h"
#include <string.h>

#ifdef DECLARE_MEMMOVE
extern "C" {
  void *memmove(void *, const void *, size_t);
}
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class LiteralStorageObject : public StorageObject {
public:
  LiteralStorageObject(const StringC &);
  Boolean read(char *buf, size_t bufSize, Messenger &, size_t &nread);
  Boolean rewind(Messenger &);
private:
  LiteralStorageObject(const LiteralStorageObject &);	// undefined
  void operator=(const LiteralStorageObject &); // undefined

  StringC str_;
  size_t nBytesRead_;
};

class MemoryInputCodingSystem : public InputCodingSystem {
public:
  Decoder *makeDecoder() const;
};

class MemoryDecoder : public Decoder {
public:
  MemoryDecoder();
  size_t decode(Char *, const char *, size_t, const char **);
};

LiteralStorageManager::LiteralStorageManager(const char *type)
: type_(type)
{
}

StorageObject *LiteralStorageManager::makeStorageObject(const StringC &id,
							const StringC &,
							Boolean,
							Boolean,
							Messenger &,
							StringC &foundId)
{
  foundId = id;
  return new LiteralStorageObject(id);
}

const InputCodingSystem *LiteralStorageManager::requiredCodingSystem() const
{
  static MemoryInputCodingSystem cs;
  return &cs;
}

Boolean LiteralStorageManager::requiresCr() const
{
  return 1;
}

const char *LiteralStorageManager::type() const
{
  return type_;
}

Boolean LiteralStorageManager::inheritable() const
{
  return 0;
}

LiteralStorageObject::LiteralStorageObject(const StringC &str)
: str_(str), nBytesRead_(0)
{
}

Boolean LiteralStorageObject::rewind(Messenger &)
{
  nBytesRead_ = 0;
  return 1;
}

Boolean LiteralStorageObject::read(char *buf, size_t bufSize,
				   Messenger &, size_t &nread)
{
  if (nBytesRead_ >= str_.size()*sizeof(Char))
    return 0;
  nread = str_.size()*sizeof(Char) - nBytesRead_;
  if (nread > bufSize)
    nread = bufSize;
  memcpy(buf, (char *)str_.data() + nBytesRead_, nread);
  nBytesRead_ += nread;
  return 1;
}

Decoder *MemoryInputCodingSystem::makeDecoder() const
{
  return new MemoryDecoder;
}

MemoryDecoder::MemoryDecoder()
: Decoder(sizeof(Char))
{
}

size_t MemoryDecoder::decode(Char *to, const char *from, size_t fromLen,
			     const char **rest)
{
  size_t nChars = fromLen/sizeof(Char);
  *rest = from + nChars*sizeof(Char);
  if (from != (char *)to)
    memmove(to, from, nChars*sizeof(Char));
  return nChars;
}

#ifdef SP_NAMESPACE
}
#endif
