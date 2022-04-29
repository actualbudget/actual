#include "config.h"
#include <stddef.h>

#ifndef HAVE_MEMCMP

int memcmp(const void *s1, const void *s2, size_t n)
{
  const char *p1 = (const char *)s1;
  const char *p2 = (const char *)s2;
  size_t i;
  for (i = 0; i < n; i++, p1++, p2++)
    if (*p1 != *p2)
      return (*p1 - *p2);
  return 0;
}

#endif
