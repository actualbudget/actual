#include "config.h"
#include <stddef.h>

#ifndef HAVE_MEMMOVE

/* jwl - for some reason it can't find emscripten's memmove but it
 * does indeed exist. Don't redefine it. */

/* void *memmove(void *p1, const void *p2, size_t n) */
/* { */
/*   bcopy(p2, p1, n); */
/*   return p1; */
/* } */

#endif
