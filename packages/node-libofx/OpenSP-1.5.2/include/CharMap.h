// Copyright (c) 1997 James Clark, 2000 Matthias Clasen
// See the file COPYING for copying permission.

#ifndef CharMap_INCLUDED
#define CharMap_INCLUDED 1

#include "types.h"
#include "Resource.h"

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef SP_MULTI_BYTE

class CharMapBits {
public:
  // 21 bits are enough for the UTF-16 range
  enum { level0 = 5, level1 = 8, level2 = 4, level3 = 4 };

  enum {
    planes = (1 << CharMapBits::level0) ,
    pagesPerPlane = (1 << CharMapBits::level1),
    columnsPerPage = (1 << CharMapBits::level2),
    cellsPerColumn = (1 << CharMapBits::level3),
    planeSize = (1 << (CharMapBits::level1 + CharMapBits::level2 + CharMapBits::level3)),
    pageSize = (1 << (CharMapBits::level2 + CharMapBits::level3)),
    columnSize = (1 << CharMapBits::level3)
  };

  static size_t planeIndex(size_t c) {
    return (c >> (CharMapBits::level1 + CharMapBits::level2 + CharMapBits::level3));
  }
  static size_t pageIndex(size_t c) {
    return ((c >> (CharMapBits::level2 + CharMapBits::level3)) & (pagesPerPlane - 1));
  }
  static size_t columnIndex(size_t c) {
    return ((c >> CharMapBits::level3) & (columnsPerPage - 1));
  }
  static size_t cellIndex(size_t c) {
    return (c & (cellsPerColumn - 1));
  }
  static size_t maxInPlane(size_t c) {
    return (c | (planeSize - 1));
  }
  static size_t maxInPage(size_t c) {
    return (c | (pageSize - 1));
  }
  static size_t maxInColumn(size_t c) {
    return (c | (columnSize - 1));
  }
};

#if 0
// These are defines rather than static member functions of CharMapBits,
// since gcc chokes on them in array allocations.
#define planes         (1 << CharMapBits::level0) 
#define pagesPerPlane  (1 << CharMapBits::level1)
#define columnsPerPage (1 << CharMapBits::level2)
#define cellsPerColumn (1 << CharMapBits::level3)
#define planeSize      (1 << (CharMapBits::level1 + CharMapBits::level2 + CharMapBits::level3))
#define pageSize       (1 << (CharMapBits::level2 + CharMapBits::level3))
#define columnSize     (1 << CharMapBits::level3)
#define planeIndex(c)  ((c) >> (CharMapBits::level1 + CharMapBits::level2 + CharMapBits::level3)) 
#define pageIndex(c)   (((c) >> (CharMapBits::level2 + CharMapBits::level3)) & (pagesPerPlane - 1))
#define columnIndex(c) (((c) >> CharMapBits::level3) & (columnsPerPage - 1))
#define cellIndex(c)   ((c) & (cellsPerColumn - 1))
#define maxInPlane(c)  ((c) | (planeSize - 1))
#define maxInPage(c)   ((c) | (pageSize - 1))
#define maxInColumn(c) ((c) | (columnSize - 1))
#endif

template<class T>
class CharMapColumn {
public:
  CharMapColumn();
  CharMapColumn(const CharMapColumn<T> &);
  void operator=(const CharMapColumn<T> &);
  ~CharMapColumn();
  T *values;
  T value;
};

template<class T>
class CharMapPage {
public:
  CharMapPage();
  CharMapPage(const CharMapPage<T> &);
  void operator=(const CharMapPage<T> &);
  ~CharMapPage();
  void swap(CharMapPage<T> &);
  CharMapColumn<T> *values;
  T value;
};

template<class T>
class CharMapPlane {
public:
  CharMapPlane();
  CharMapPlane(const CharMapPlane<T> &);
  void operator=(const CharMapPlane<T> &);
  ~CharMapPlane();
  void swap(CharMapPlane<T> &);
  CharMapPage<T> *values;
  T value;
};
#endif /* SP_MULTI_BYTE */

template<class T>
class CharMap {
public:
  CharMap();
  CharMap(T);
  T operator[](Char) const;
  T getRange(Char from, Char &to) const;
  void swap(CharMap<T> &);
  void setChar(Char, T);
  void setRange(Char from, Char to, T val);
  void setAll(T);
private:
#ifdef SP_MULTI_BYTE

  CharMapPlane<T> values_[CharMapBits::planes];
  T lo_[256];
#else
  T values_[256];
#endif
};

template<class T>
class CharMapResource : public CharMap<T>, public Resource {
public:
  CharMapResource() { }
  CharMapResource(T t) : CharMap<T>(t) { }
};

#ifdef SP_MULTI_BYTE

template<class T>
inline
T CharMap<T>::operator[](Char c) const
{
  if (c < 256)
    return lo_[c];
  const CharMapPlane<T> &pl = values_[CharMapBits::planeIndex(c)];
  if (pl.values) {
    const CharMapPage<T> &pg = pl.values[CharMapBits::pageIndex(c)];
    if (pg.values) {
      const CharMapColumn<T> &column = pg.values[CharMapBits::columnIndex(c)];
      if (column.values)
        return column.values[CharMapBits::cellIndex(c)];
      else
        return column.value;
    }
    else
      return pg.value;
  }
  else
    return pl.value;
}

template<class T>
inline
T CharMap<T>::getRange(Char c, Char &max) const
{
  if (c < 256) {
    max = c;
    return lo_[c];
  }
  const CharMapPlane<T> &pl = values_[CharMapBits::planeIndex(c)];
  if (pl.values) {
    const CharMapPage<T> &pg = pl.values[CharMapBits::pageIndex(c)];
    if (pg.values) {
      const CharMapColumn<T> &column = pg.values[CharMapBits::columnIndex(c)];
      if (column.values) {
        max = c;
        return column.values[CharMapBits::cellIndex(c)];
      }
      else {
        max = CharMapBits::maxInColumn(c);
        return column.value;
      }
    }
    else {
      max = CharMapBits::maxInPage(c);
      return pg.value;
    }
  }
  else {
    max = CharMapBits::maxInPlane(c);
    return pl.value;
  }
}

#else

template<class T>
inline
T CharMap<T>::operator[](Char c) const
{
  return values_[c];
}

template<class T>
inline
T CharMap<T>::getRange(Char c, Char &max) const
{
  max = c;
  return values_[c];
}

template<class T>
inline
void CharMap<T>::setChar(Char c, T val)
{
  values_[c] = val;
}

#endif

#ifdef SP_NAMESPACE
}
#endif

#endif /* not CharMap_INCLUDED */

#ifdef SP_DEFINE_TEMPLATES
#include "CharMap.cxx"
#endif
