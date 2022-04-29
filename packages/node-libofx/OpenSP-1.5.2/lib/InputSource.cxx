// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "InputSource.h"
#include "MarkupScan.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

InputSource::InputSource(InputSourceOrigin *origin, const Char *start,
			 const Char *end)
: origin_(origin), start_(start), end_(end), cur_(start), accessError_(0),
  startLocation_(origin, 0), multicode_(0), scanSuppress_(0)
{
}

void InputSource::reset(const Char *start,
			const Char *end)
{
  origin_ = origin_->copy();
  start_ = start;
  end_ = end;
  cur_ = start_;
  startLocation_ = Location(origin_.pointer(), 0);
  multicode_ = 0;
  scanSuppress_ = 0;
  markupScanTable_.clear();
}

InputSource::~InputSource()
{
}

void InputSource::advanceStartMulticode(const Char *to)
{
  while (start_ < to) {
    switch (markupScanTable_[*start_]) {
    case MarkupScan::normal:
      break;
    case MarkupScan::in:
      scanSuppress_ = 0;
      break;
    case MarkupScan::out:
      if (!scanSuppress()) {
	scanSuppress_ = 1;
	scanSuppressSingle_ = 0;
      }
      break;
    case MarkupScan::suppress:
      // what's the effect of MSSCHAR followed by MSSCHAR
      if (!scanSuppress()) {
	scanSuppress_ = 1;
	scanSuppressSingle_ = 1;
	scanSuppressIndex_ = startLocation_.index() + 1;
      }
      break;
    }
    start_++;
    startLocation_ += 1;
  }
}

void InputSource::willNotRewind()
{
}

void InputSource::setDocCharset(const CharsetInfo &,
				const CharsetInfo &)
{
}

void InputSource::willNotSetDocCharset()
{
}

InternalInputSource *InputSource::asInternalInputSource()
{
  return 0;
}

#ifdef SP_NAMESPACE
}
#endif
