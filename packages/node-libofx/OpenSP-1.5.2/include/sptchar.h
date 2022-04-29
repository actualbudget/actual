// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifndef sptchar_INCLUDED
#define sptchar_INCLUDED 1

#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <ctype.h>

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef SP_WIDE_SYSTEM

typedef wchar_t SP_TCHAR;
typedef wchar_t SP_TUCHAR;

#define SP_T(x) L ## x

inline
wchar_t *tgetenv(const wchar_t *s)
{
  return _wgetenv(s);
}

inline
int tcscmp(const wchar_t *s1, const wchar_t *s2)
{
  return wcscmp(s1, s2);
}

inline
int tcsncmp(const wchar_t *s1, const wchar_t *s2, size_t n)
{
  return wcsncmp(s1, s2, n);
}

inline
unsigned long tcstoul(const wchar_t *s, const wchar_t **sp, int base)
{
  return wcstoul((wchar_t *)s, (wchar_t **)sp, base);
}

inline
unsigned long tcstoul(wchar_t *s, wchar_t **sp, int base)
{
  return wcstoul(s, sp, base);
}

inline
const wchar_t *tcschr(const wchar_t *s, wint_t c)
{
  return wcschr(s, c);
}

inline
wchar_t *tcschr(wchar_t *s, wint_t c)
{
  return wcschr(s, c);
}

inline
size_t tcslen(const wchar_t *s)
{
  return wcslen(s);
}

inline
int fputts(const wchar_t *s, FILE *fp)
{
  return fputws(s, fp);
}

inline
int totupper(wint_t c)
{
  return towupper(c);
}

inline
bool istalnum(wint_t c)
{
  return iswalnum(c);
}
 
#else /* not SP_WIDE_SYSTEM */

typedef char SP_TCHAR;
typedef unsigned char SP_TUCHAR;

#define SP_T(x) x

inline
char *tgetenv(const char *s)
{
  return getenv(s);
}

inline
int tcscmp(const char *s1, const char *s2)
{
  return strcmp(s1, s2);
}

inline
int tcsncmp(const char *s1, const char *s2, size_t n)
{
  return strncmp(s1, s2, n);
}

inline
unsigned long tcstoul(const char *s, const char **sp, int base)
{
  return strtoul((char *)s, (char **)sp, base);
}

inline
unsigned long tcstoul(char *s, char **sp, int base)
{
  return strtoul(s, sp, base);
}

inline
const char *tcschr(const char *s, int c)
{
  return strchr(s, c);
}

inline
char *tcschr(char *s, int c)
{
  return strchr(s, c);
}

inline
size_t tcslen(const char *s)
{
  return strlen(s);
}

inline
int fputts(const char *s, FILE *fp)
{
  return fputs(s, fp);
}

inline
int totupper(int c)
{
  return toupper(c);
}

inline
bool istalnum(int c)
{
  return isalnum(c);
}

#endif /* not SP_WIDE_SYSTEM */

#ifdef SP_NAMESPACE
}
#endif

#endif /* not sptchar_INCLUDED */
