// Copyright (c) 1995 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "Boolean.h"
#include "SGMLApplication.h"

SGMLApplication::~SGMLApplication()
{
}

void SGMLApplication::appinfo(const AppinfoEvent &)
{
}

void SGMLApplication::startDtd(const StartDtdEvent &)
{
}

void SGMLApplication::endDtd(const EndDtdEvent &)
{
}

void SGMLApplication::endProlog(const EndPrologEvent &)
{
}

void SGMLApplication::startElement(const StartElementEvent &)
{
}

void SGMLApplication::endElement(const EndElementEvent &)
{
}

void SGMLApplication::data(const DataEvent &)
{
}

void SGMLApplication::sdata(const SdataEvent &)
{
}

void SGMLApplication::pi(const PiEvent &)
{
}

void SGMLApplication::externalDataEntityRef(const ExternalDataEntityRefEvent &)
{
}

void SGMLApplication::subdocEntityRef(const SubdocEntityRefEvent &)
{
}

void SGMLApplication::nonSgmlChar(const NonSgmlCharEvent &)
{
}

void SGMLApplication::commentDecl(const CommentDeclEvent &)
{
}

void SGMLApplication::markedSectionStart(const MarkedSectionStartEvent &)
{
}

void SGMLApplication::markedSectionEnd(const MarkedSectionEndEvent &)
{
}

void SGMLApplication::ignoredChars(const IgnoredCharsEvent &)
{
}

void SGMLApplication::generalEntity(const GeneralEntityEvent &)
{
}

void SGMLApplication::error(const ErrorEvent &)
{
}

void SGMLApplication::openEntityChange(const OpenEntityPtr &)
{
}


SGMLApplication::OpenEntity::OpenEntity()
: count_(0)
{
}

SGMLApplication::OpenEntity::~OpenEntity()
{
}

SGMLApplication::OpenEntityPtr::OpenEntityPtr()
: ptr_(0)
{
}

SGMLApplication::OpenEntityPtr::OpenEntityPtr(const OpenEntityPtr &ptr)
: ptr_(ptr.ptr_)
{
  if (ptr_)
    ptr_->count_ += 1;
}

SGMLApplication::OpenEntityPtr::~OpenEntityPtr()
{
  if (ptr_) {
    ptr_->count_ -= 1;
    if (ptr_->count_ == 0)
      delete ptr_;
  }
}

void SGMLApplication::OpenEntityPtr::operator=(OpenEntity *p)
{
  if (p)
    p->count_ += 1;
  if (ptr_) {
    ptr_->count_ -= 1;
    if (ptr_->count_ == 0)
      delete ptr_;
  }
  ptr_ = p;
}

SGMLApplication::Location::Location()
{
  init();
}

SGMLApplication::Location::Location(const OpenEntityPtr &ptr, Position pos)
{
  if (ptr)
    *this = ptr->location(pos);
  else
    init();
}

void SGMLApplication::Location::init()
{
  entityName.ptr = 0;
  entityName.len = 0;
  filename.ptr = 0;
  filename.len = 0;
  lineNumber = (unsigned long)-1;
  columnNumber = (unsigned long)-1;
  byteOffset = (unsigned long)-1;
  entityOffset = (unsigned long)-1;
  other = 0;
}
