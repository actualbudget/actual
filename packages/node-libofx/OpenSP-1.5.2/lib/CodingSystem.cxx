// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "CodingSystem.h"

#include <string.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

InputCodingSystem::~InputCodingSystem()
{
}

StringC InputCodingSystem::convertIn(const char *s) const
{
  Decoder *decoder = makeDecoder();
  StringC str;
  str.resize(strlen(s));
  str.resize(decoder->decode(&str[0], s, strlen(s), &s));
  delete decoder;
  return str;
}

Boolean InputCodingSystem::isIdentity() const
{
  return 0;
}

OutputCodingSystem::~OutputCodingSystem()
{
}

unsigned OutputCodingSystem::fixedBytesPerChar() const
{
  return 0;
}

String<char> OutputCodingSystem::convertOut(const StringC &str) const
{
  Encoder *encoder = makeEncoder();
  StrOutputByteStream stream;
  encoder->output(str.data(), str.size(), &stream);
  delete encoder;
  String<char> result;
  stream.extractString(result);
  result += '\0';
  return result;
}

Decoder::Decoder(unsigned minBytesPerChar)
: minBytesPerChar_(minBytesPerChar)
{
}

Decoder::~Decoder()
{
}

Boolean Decoder::convertOffset(unsigned long &) const
{
  return false;
}

Encoder::Encoder()
{
}

Encoder::~Encoder()
{
}

Encoder::Handler::~Handler()
{
}

void Encoder::output(Char *s, size_t n, OutputByteStream *sp)
{
  output((const Char *)s, n, sp);
}

void Encoder::startFile(OutputByteStream *)
{
}

void Encoder::handleUnencodable(Char, OutputByteStream *)
{
}

void Encoder::setUnencodableHandler(Handler *)
{
}

RecoveringEncoder::RecoveringEncoder()
: unencodableHandler_(0)
{
}

void RecoveringEncoder::handleUnencodable(Char c, OutputByteStream *sbufp)
{
  if (unencodableHandler_)
    unencodableHandler_->handleUnencodable(c, sbufp);
}

void RecoveringEncoder::setUnencodableHandler(Handler *handler)
{
  unencodableHandler_ = handler;
}

#ifdef SP_NAMESPACE
}
#endif
