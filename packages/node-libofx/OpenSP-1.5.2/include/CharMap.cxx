// Copyright (c) 1997 James Clark
// See the file COPYING for copying permission.

#ifndef CharMap_DEF_INCLUDED
#define CharMap_DEF_INCLUDED 1

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef SP_MULTI_BYTE

template<class T>
CharMap<T>::CharMap()
{
}

template<class T>
CharMap<T>::CharMap(T dflt)
{
  for (size_t i = 0; i < 256; i++)
    lo_[i] = dflt;
  for (size_t i = 0; i < CharMapBits::planes; i++)
    values_[i].value = dflt;
}

template<class T>
void CharMap<T>::setAll(T val)
{
  for (size_t i = 0; i < 256; i++)
    lo_[i] = val;
  for (size_t i = 0; i < CharMapBits::planes; i++) {
    values_[i].value = val;
    delete [] values_[i].values;
    values_[i].values = 0;
  }
}

template<class T>
void CharMap<T>::swap(CharMap<T> &map)
{
  for (size_t i = 0; i < 256; i++) {
    T tem(lo_[i]);
    lo_[i] = map.lo_[i];
    map.lo_[i] = tem;
  }
  for (size_t i = 0; i < CharMapBits::planes; i++)
    values_[i].swap(map.values_[i]);
}

template<class T>
void CharMap<T>::setChar(Char c, T val)
{
  if (c < 256) {
    lo_[c] = val;
    return;
  }
  CharMapPlane<T> &pl = values_[CharMapBits::planeIndex(c)];
  if (pl.values) {
    CharMapPage<T> &pg = pl.values[CharMapBits::pageIndex(c)];
    if (pg.values) {
      CharMapColumn<T> &column = pg.values[CharMapBits::columnIndex(c)];
      if (column.values)
        column.values[CharMapBits::cellIndex(c)] = val;
      else if (val != column.value) {
        column.values = new T[CharMapBits::columnSize];
        for (size_t i = 0; i < CharMapBits::columnSize; i++)
  	  column.values[i] = column.value;
        column.values[CharMapBits::cellIndex(c)] = val;
      }
    }
    else if (val != pg.value) {
      pg.values = new CharMapColumn<T>[CharMapBits::columnsPerPage];
      for (size_t i = 0; i < CharMapBits::columnsPerPage; i++)
        pg.values[i].value = pg.value;
      CharMapColumn<T> &column = pg.values[CharMapBits::columnIndex(c)];
      column.values = new T[CharMapBits::cellsPerColumn];
      for (size_t i = 0; i < CharMapBits::cellsPerColumn; i++)
        column.values[i] = column.value;
      column.values[CharMapBits::cellIndex(c)] = val;
    }
  }
  else if (val != pl.value) {
    pl.values = new CharMapPage<T>[CharMapBits::pagesPerPlane];
    for (size_t i = 0; i < CharMapBits::pagesPerPlane; i++)
      pl.values[i].value = pl.value;
    CharMapPage<T> &page = pl.values[CharMapBits::pageIndex(c)];
    page.values = new CharMapColumn<T>[CharMapBits::columnsPerPage];
    for (size_t i = 0; i < CharMapBits::columnsPerPage; i++)
      page.values[i].value = page.value;
    CharMapColumn<T> &column = page.values[CharMapBits::columnIndex(c)];
    column.values = new T[CharMapBits::cellsPerColumn];
    for (size_t i = 0; i < CharMapBits::cellsPerColumn; i++)
      column.values[i] = column.value;
    column.values[CharMapBits::cellIndex(c)] = val;
  }
}

template<class T>
void CharMap<T>::setRange(Char from, Char to, T val)
{
  for (; from < 256; from++) { 
    lo_[from] = val;
    if (from == to)
      return;
  }
  do {
    if ((from & (CharMapBits::columnSize - 1)) == 0
        && to - from >= CharMapBits::columnSize - 1) {
      if ((from & (CharMapBits::pageSize - 1)) == 0
	  && to - from >= CharMapBits::pageSize - 1) {
        if ((from & (CharMapBits::planeSize - 1)) == 0
	    && to - from >= CharMapBits::planeSize - 1) {
	  // Set a complete plane.
	  CharMapPlane<T> &pl = values_[CharMapBits::planeIndex(from)];
          pl.value = val;
          delete [] pl.values;
          pl.values = 0; 
	  from += CharMapBits::planeSize - 1;
        }
        else {
	  // Set a complete page.
	  CharMapPlane<T> &pl = values_[CharMapBits::planeIndex(from)];
          if (pl.values) {
	    CharMapPage<T> &pg = pl.values[CharMapBits::pageIndex(from)];
	    pg.value = val;
	    delete [] pg.values;
	    pg.values = 0;
          }
          else if (val != pl.value) {
	    // split the plane
	    pl.values = new CharMapPage<T>[CharMapBits::pagesPerPlane];
            for (size_t i = 0; i < CharMapBits::pagesPerPlane; i++)
	      pl.values[i].value = pl.value;
	    CharMapPage<T> &page = pl.values[CharMapBits::pageIndex(from)];
            page.value = val;
	  }
	  from += CharMapBits::pageSize - 1;
        }
      }
      else {
	// Set a complete column.
	CharMapPlane<T> &pl = values_[CharMapBits::planeIndex(from)];
        if (pl.values) {
	  CharMapPage<T> &pg = pl.values[CharMapBits::pageIndex(from)];
	  if (pg.values) {
	    CharMapColumn<T> &column = pg.values[CharMapBits::columnIndex(from)];
	    column.value = val;
	    delete [] column.values;
	    column.values = 0;
	  }
	  else if (val != pg.value) {
	    // split the page
	    pg.values = new CharMapColumn<T>[CharMapBits::columnsPerPage];
            for (size_t i = 0; i < CharMapBits::columnsPerPage; i++)
	      pg.values[i].value = pg.value;
	    CharMapColumn<T> &column = pg.values[CharMapBits::columnIndex(from)];
	    column.value = val;
	  }
        }
        else if (val != pl.value) {
	  // split the plane
	  pl.values = new CharMapPage<T>[CharMapBits::pagesPerPlane];
          for (size_t i = 0; i < CharMapBits::pagesPerPlane; i++)
	    pl.values[i].value = pl.value;
	  CharMapPage<T> &pg = pl.values[CharMapBits::pageIndex(from)];
          pg.value = val;
	  // split the page
	  pg.values = new CharMapColumn<T>[CharMapBits::columnsPerPage];
          for (size_t i = 0; i < CharMapBits::columnsPerPage; i++)
	    pg.values[i].value = pg.value;
	  CharMapColumn<T> &column = pg.values[CharMapBits::columnIndex(from)];
	  column.value = val;
	}
	from += CharMapBits::columnSize - 1;
      }
    }
    else
      setChar(from, val);
  } while (from++ != to);
}

template<class T>
CharMapPlane<T>::CharMapPlane()
: values(0)
{
}

template<class T>
CharMapPlane<T>::CharMapPlane(const CharMapPlane<T> &pl)
{
  if (pl.values) {
    values = new CharMapPage<T>[CharMapBits::pagesPerPlane];
    for (size_t i = 0; i < CharMapBits::pagesPerPlane; i++)
      values[i] = pl.values[i];
  }
  else {
    value = pl.value;
    values = 0;
  }
}

template<class T>
void CharMapPlane<T>::operator=(const CharMapPlane<T> &pl)
{
  if (pl.values) {
    if (!values)
      values = new CharMapPage<T>[CharMapBits::pagesPerPlane];
    for (size_t i = 0; i < CharMapBits::pagesPerPlane; i++)
      values[i] = pl.values[i];
  }
  else {
    if (values) {
      delete [] values;
      values = 0;
    }
    value = pl.value;
  }
}

template<class T>
CharMapPlane<T>::~CharMapPlane()
{
  delete [] values;
}

template<class T>
void CharMapPlane<T>::swap(CharMapPlane<T> &pl)
{
  {
    CharMapPage<T> *tem = values;
    values = pl.values;
    pl.values = tem;
  }
  {
    T tem(value);
    value = pl.value;
    pl.value = tem;
  }
}

template<class T>
CharMapPage<T>::CharMapPage()
: values(0)
{
}

template<class T>
CharMapPage<T>::CharMapPage(const CharMapPage<T> &pg)
{
  if (pg.values) {
    values = new CharMapColumn<T>[CharMapBits::columnsPerPage];
    for (size_t i = 0; i < CharMapBits::columnsPerPage; i++)
      values[i] = pg.values[i];
  }
  else {
    value = pg.value;
    values = 0;
  }
}

template<class T>
void CharMapPage<T>::operator=(const CharMapPage<T> &pg)
{
  if (pg.values) {
    if (!values)
      values = new CharMapColumn<T>[CharMapBits::columnsPerPage];
    for (size_t i = 0; i < CharMapBits::columnsPerPage; i++)
      values[i] = pg.values[i];
  }
  else {
    if (values) {
      delete [] values;
      values = 0;
    }
    value = pg.value;
  }
}

template<class T>
CharMapPage<T>::~CharMapPage()
{
  delete [] values;
}

template<class T>
void CharMapPage<T>::swap(CharMapPage<T> &pg)
{
  {
    CharMapColumn<T> *tem = values;
    values = pg.values;
    pg.values = tem;
  }
  {
    T tem(value);
    value = pg.value;
    pg.value = tem;
  }
}

template<class T>
CharMapColumn<T>::CharMapColumn()
: values(0)
{
}

template<class T>
CharMapColumn<T>::CharMapColumn(const CharMapColumn<T> &col)
{
  if (col.values) {
    values = new T[CharMapBits::cellsPerColumn];
    for (size_t i = 0; i < CharMapBits::cellsPerColumn; i++)
      values[i] = col.values[i];
  }
  else {
    values = 0;
    value = col.value;
  }
}

template<class T>
void CharMapColumn<T>::operator=(const CharMapColumn<T> &col)
{
  if (col.values) {
    if (!values)
      values = new T[CharMapBits::cellsPerColumn];
    for (size_t i = 0; i < CharMapBits::cellsPerColumn; i++)
      values[i] = col.values[i];
  }
  else {
    if (values) {
      delete [] values;
      values = 0;
    }
    value = col.value;
  }
}

template<class T>
CharMapColumn<T>::~CharMapColumn()
{
  delete [] values;
}

#else /* not SP_MULTI_BYTE */

template<class T>
CharMap<T>::CharMap()
{
}

template<class T>
CharMap<T>::CharMap(T dflt)
{
  for (int i = 0; i < 256; i++)
    values_[i] = dflt;
}

template<class T>
void CharMap<T>::setAll(T val)
{
  for (size_t i = 0; i < 256; i++)
    values_[i] = val;
}

template<class T>
void CharMap<T>::setRange(Char from, Char to, T val)
{
  do {
    values_[from] = val;
  } while (from++ != to);
}

template<class T>
void CharMap<T>::swap(CharMap<T> &map)
{
  for (size_t i = 0; i < 256; i++) {
    T tem(values_[i]);
    values_[i] = map.values_[i];
    map.values_[i] = tem;
  }
}

#endif /* not SP_MULTI_BYTE */

#ifdef SP_NAMESPACE
}
#endif

#endif /* not CharMap_DEF_INCLUDED */
