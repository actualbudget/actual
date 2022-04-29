// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif
#include "splib.h"
#include "Undo.h"
#include "ParserState.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

Undo::Undo()
{
}

Undo::~Undo()
{
}

UndoTransition::UndoTransition(const MatchState &state)
: state_(state)
{
}

void UndoTransition::undo(ParserState *parser)
{
  parser->currentElement().setMatchState(state_);
}

UndoStartTag::UndoStartTag()
{
}

void UndoStartTag::undo(ParserState *parser)
{
  parser->popElement();
}

UndoEndTag::UndoEndTag(OpenElement *e)
: element_(e)
{
}

void UndoEndTag::undo(ParserState *parser)
{
  parser->pushElement(element_.extract());
}

#ifdef SP_NAMESPACE
}
#endif
