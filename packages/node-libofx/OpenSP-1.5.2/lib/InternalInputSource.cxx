// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include <string.h>
#include "InternalInputSource.h"
#include "macros.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

InternalInputSource::InternalInputSource(const StringC &str,
					 InputSourceOrigin *origin)
: InputSource(origin, str.data(), str.data() + str.size()), buf_(0),
  contents_(&str)
{
}

InternalInputSource::~InternalInputSource()
{
  if (buf_)
    delete [] buf_;
}

Xchar InternalInputSource::fill(Messenger &)
{
  return eE;
}

void InternalInputSource::pushCharRef(Char c, const NamedCharRef &ref)
{
  ASSERT(cur() == start());
  noteCharRef(startIndex() + (cur() - start()), ref);
  if (buf_ == 0) {
    buf_ = new Char[end() - start() + 1];
    memcpy(buf_ + 1, cur(), (end() - start())*sizeof(Char));
    changeBuffer(buf_ + 1, cur());
  }
  moveLeft();
  *(Char *)cur() = c;
}

Boolean InternalInputSource::rewind(Messenger &)
{
  reset(contents_->data(),
	contents_->data() + contents_->size());
  if (buf_) {
    delete [] buf_;
    buf_ = 0;
  }
  return 1;
}

const StringC *InternalInputSource::contents() {
  return contents_;
}

InternalInputSource *InternalInputSource::asInternalInputSource()
{
  return this;
}


#ifdef SP_NAMESPACE
}
#endif
