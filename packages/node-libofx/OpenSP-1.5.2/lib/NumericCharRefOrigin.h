#ifndef NumericCharRefOrigin_INCLUDED
#define NumericCharRefOrigin_INCLUDED 1

#ifdef __GNUG__
#pragma interface
#endif

#include "Location.h"
#include "Markup.h"
#include "Owner.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

class NumericCharRefOrigin : public Origin {
public:
  NumericCharRefOrigin(const Location &start, Index endIndex,
		       Owner<Markup> &markup);
  const Location &parent() const;
  Index refLength() const;
  Boolean isNumericCharRef(const Markup *&) const;
private:
  NumericCharRefOrigin(const NumericCharRefOrigin &); // undefined
  void operator=(const NumericCharRefOrigin &);	      // undefined
  Location start_;
  Index refLength_;
  Owner<Markup> markup_;
};

#ifdef SP_NAMESPACE
}
#endif

#endif /* not NumericCharRefOrigin_INCLUDED */
