#ifndef constant_INCLUDED
#define constant_INCLUDED 1

#include "types.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef SP_MULTI_BYTE
// restrict Char to the UTF-16 range for now
const Char charMax = 0x10ffff;
#else
const Char charMax = Char(-1);
#endif
const WideChar wideCharMax = WideChar(-1);
const UnivChar univCharMax = UnivChar(-1);
const SyntaxChar syntaxCharMax = SyntaxChar(-1);

#ifdef SP_NAMESPACE
}
#endif

#endif /* not constant_INCLUDED */
