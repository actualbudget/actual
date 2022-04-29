#ifndef RewindStorageObject_INCLUDED
#define RewindStorageObject_INCLUDED 1

#include "StorageManager.h"
#include "Boolean.h"
#include "StringOf.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class Messenger;

class SP_API RewindStorageObject : public StorageObject {
public:
  RewindStorageObject(Boolean mayRewind, Boolean canSeek);
protected:
  PackedBoolean mayRewind_;

  void saveBytes(const char *, size_t);
  Boolean readSaved(char *, size_t, size_t &);
  Boolean rewind(Messenger &);
  void willNotRewind();
  void unread(const char *s, size_t n);
  virtual Boolean seekToStart(Messenger &) = 0;
private:
  PackedBoolean savingBytes_;
  PackedBoolean readingSaved_;
  PackedBoolean canSeek_;
  String<char> savedBytes_;
  size_t nBytesRead_;
};

inline
void RewindStorageObject::saveBytes(const char *s, size_t n)
{
  if (savingBytes_)
    savedBytes_.append(s, n);
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not RewindStorageObject_INCLUDED */
