// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef CodingSystem_INCLUDED
#define CodingSystem_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "types.h"
#include "Boolean.h"
#include "StringC.h"
#include "OutputByteStream.h"

#include <stddef.h>


#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API Decoder {
public:
  Decoder(unsigned minBytesPerChar = 1);
  virtual ~Decoder();
  virtual size_t decode(Char *, const char *, size_t, const char **) = 0;
  virtual Boolean convertOffset(unsigned long &offset) const;
  // Decoder assumes that for every decoded Char there must be at least
  // minBytesPerChar bytes
  unsigned minBytesPerChar() const;
protected:
  unsigned minBytesPerChar_;
};


class SP_API Encoder {
public:
  class SP_API Handler {
  public:
    virtual ~Handler();
    virtual void handleUnencodable(Char, OutputByteStream *) = 0;
  };
  Encoder();
  virtual ~Encoder();
  virtual void output(const Char *, size_t, OutputByteStream *) = 0;
  // This outputs a byte order mark with Unicode.
  virtual void startFile(OutputByteStream *);
  virtual void output(Char *, size_t, OutputByteStream *);
  virtual void setUnencodableHandler(Handler *);
  virtual void handleUnencodable(Char, OutputByteStream *);
};

class SP_API RecoveringEncoder : public Encoder {
public:
  RecoveringEncoder();
  void setUnencodableHandler(Handler *);
  void handleUnencodable(Char, OutputByteStream *);
private:
  Handler *unencodableHandler_;
};

class SP_API InputCodingSystem {
public:
  virtual ~InputCodingSystem();
  // one of these has to be overwritten
  virtual Decoder *makeDecoder() const { return makeDecoder(1); } 
  virtual Decoder *makeDecoder(Boolean lsbFirst) const { return makeDecoder(lsbFirst,1); }
  virtual Decoder *makeDecoder(Boolean lsbFirst, Boolean lswFirst) const { return makeDecoder(); }
  StringC convertIn(const char *) const;
  virtual Boolean isIdentity() const;
};

class SP_API OutputCodingSystem {
public:
  virtual ~OutputCodingSystem();
  virtual Encoder *makeEncoder() const = 0;
  virtual unsigned fixedBytesPerChar() const;
  String<char> convertOut(const StringC &) const;
};

class SP_API CodingSystem : public InputCodingSystem, public OutputCodingSystem {
public:
  inline ~CodingSystem() {}
};

inline
unsigned Decoder::minBytesPerChar() const
{
  return minBytesPerChar_;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not CodingSystem_INCLUDED */
