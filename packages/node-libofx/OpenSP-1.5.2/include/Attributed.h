// Copyright (c) 1994 James Clark
// See the file COPYING for copying permission.

#ifndef Attributed_INCLUDED
#define Attributed_INCLUDED 1

#include "Ptr.h"
#include "Attribute.h"

// This is used for things that have attribute definitions
// that notations and elements.

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class SP_API Attributed {
public:
  Attributed() { }
  ConstPtr<AttributeDefinitionList> attributeDef() const;
  const AttributeDefinitionList *attributeDefTemp() const;
  Ptr<AttributeDefinitionList> attributeDef();
  void setAttributeDef(const Ptr<AttributeDefinitionList> &);
private:
  Ptr<AttributeDefinitionList> attributeDef_;

};

inline
ConstPtr<AttributeDefinitionList> Attributed::attributeDef() const
{
  return attributeDef_;
}

inline
const AttributeDefinitionList *Attributed::attributeDefTemp() const
{
  return attributeDef_.pointer();
}

inline
Ptr<AttributeDefinitionList> Attributed::attributeDef()
{
  return attributeDef_;
}

inline
void Attributed::setAttributeDef(const Ptr<AttributeDefinitionList> &def)
{
  attributeDef_ = def;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Attributed_INCLUDED */
