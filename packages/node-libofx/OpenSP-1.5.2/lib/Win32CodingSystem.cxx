// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"

#ifdef SP_MULTI_BYTE

#include <windows.h>
#include <io.h>
#include "Win32CodingSystem.h"
#include "Boolean.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SingleByteWin32Decoder : public Decoder {
public:
  SingleByteWin32Decoder(unsigned int codePage, Char defaultChar);
  size_t decode(Char *to, const char *from, size_t fromLen,
		const char **rest);
  Boolean convertOffset(unsigned long &offset) const;
private:
  Char map_[256];
};

class MultiByteWin32Decoder : public Decoder {
public:
  MultiByteWin32Decoder(unsigned int codePage, Char defaultChar,
			unsigned char *leadByte);
  size_t decode(Char *to, const char *from, size_t fromLen,
		const char **rest);
private:
  unsigned int codePage_;
  Char defaultChar_;
  PackedBoolean isLeadByte_[256];
};

class Win32Encoder : public Encoder {
public:
  Win32Encoder(unsigned int codePage);
  ~Win32Encoder();
  void output(const Char *, size_t, OutputByteStream *);
private:
  char *buf_;
  size_t bufLen_;
  unsigned int codePage_;
};

Win32CodingSystem::Win32CodingSystem(unsigned int codePage, Char defaultChar)
: codePage_(codePage), defaultChar_(defaultChar)
{
}

Win32CodingSystem::Win32CodingSystem(SpecialCodePage codePage,
				     Char defaultChar)
: defaultChar_(defaultChar)
{
  if (codePage == codePageAnsi)
    codePage_ = GetACP();
  else
    codePage_ = GetOEMCP();
}

Boolean Win32CodingSystem::isValid() const
{
  return IsValidCodePage(codePage_);
}

Encoder *Win32CodingSystem::makeEncoder() const
{
  return new Win32Encoder(codePage_);
}

Decoder *Win32CodingSystem::makeDecoder() const
{
  CPINFO info;
  if (GetCPInfo(codePage_, &info) && info.MaxCharSize > 1)
    return new MultiByteWin32Decoder(codePage_, defaultChar_, info.LeadByte);
  else
    return new SingleByteWin32Decoder(codePage_, defaultChar_);
}

SingleByteWin32Decoder::SingleByteWin32Decoder(unsigned int codePage,
					       Char defaultChar)
{
  for (int i = 0; i < 256; i++) {
    char c = i;
    wchar_t mapped;
    if (MultiByteToWideChar(codePage, MB_PRECOMPOSED|MB_ERR_INVALID_CHARS,
			    &c, 1, &mapped, 1) == 0)
      map_[i] = defaultChar;
    else 
      map_[i] = Char(mapped);
  }
}

size_t SingleByteWin32Decoder::decode(Char *to, const char *from,
				      size_t fromLen, const char **rest)
{
  for (size_t n = fromLen; n > 0; n--)
    *to++ = map_[(unsigned char)*from++]; // zero extend
  *rest = from;
  return fromLen;
}

Boolean SingleByteWin32Decoder::convertOffset(unsigned long &) const
{
  return 1;
}

MultiByteWin32Decoder::MultiByteWin32Decoder(unsigned int codePage,
					     Char defaultChar,
					     unsigned char *leadByte)
: defaultChar_(defaultChar), codePage_(codePage)
{
  for (int i = 0; i < 256; i++)
    isLeadByte_[i] = 0;
  for (int i = 0; i < MAX_LEADBYTES; i += 2) {
    if (leadByte[i] == 0 && leadByte[i + 1] == 0)
      break;
    int lim = leadByte[i + 1];
    for (int j = leadByte[i]; j < lim; j++)
      isLeadByte_[j] = 1;
  }
}

size_t MultiByteWin32Decoder::decode(Char *to, const char *from,
				     size_t fromLen, const char **rest)
{
  size_t i;
  for (i = fromLen; i > 0; i--)
    if (!isLeadByte_[(unsigned char)from[i - 1]])
      break;
  if ((fromLen - i) & 1)
    fromLen--;

  String<wchar_t> tow;
  tow.resize(fromLen);
  int count = MultiByteToWideChar(codePage_,
				  MB_PRECOMPOSED|MB_ERR_INVALID_CHARS,
				  from, fromLen, (wchar_t *)tow.data(), fromLen);
  for (size_t i = 0; i < count; i++)
    to[i] = Char(tow[i]);
  if (count) {
    *rest = from + fromLen;
    return count;
  }
  Char *start = to;
  // Try it character by character.
  while (fromLen > 0) {
    int nBytes = 1 + isLeadByte_[(unsigned char)*from];
    ASSERT(nBytes <= fromLen);
    wchar_t tow;
    if (MultiByteToWideChar(codePage_, MB_PRECOMPOSED|MB_ERR_INVALID_CHARS,
			    from, nBytes, &tow, 1) != 1)
      *to = defaultChar_;
    else
      *to = Char(tow);
    from += nBytes;
    fromLen -= nBytes;
    to++;
  }
  *rest = from;
  return to - start;
}

Win32Encoder::Win32Encoder(unsigned int codePage)
: codePage_(codePage), buf_(0), bufLen_(0)
{
}

Win32Encoder::~Win32Encoder()
{
  delete [] buf_;
}

void Win32Encoder::output(const Char *s, size_t n, OutputByteStream *sb)
{
  if (n == 0)
    return;
  if (n*2 > bufLen_) {
    delete [] buf_;
    bufLen_ = n*2;
    buf_ = new char[bufLen_];
  }
  String<wchar_t> ws;
  ws.resize(n);
  for (size_t i = 0; i < n; i++)
    ws[i] = wchar_t(s[i]); 
  int nBytes = WideCharToMultiByte(codePage_,
				   0,
				   ws.data(),
				   n,
				   buf_,
				   bufLen_,
				   0,
				   0);
  if (nBytes)
    sb->sputn(buf_, nBytes);
}

#ifdef SP_NAMESPACE
}
#endif

#else /* not SP_MULTI_BYTE */

#ifndef __GNUG__
static char non_empty_translation_unit;	// sigh
#endif

#endif /* not SP_MULTI_BYTE */
