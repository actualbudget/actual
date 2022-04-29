#!/bin/sh

# Sun C++ 4.0.1 gets confused by the macros in include/NCVector.h.

cd include
mv NCVector.h NCVector.h.dist
sed -f NCVector.sed Vector.h >NCVector.h
chmod -w NCVector.h
sed -f NCVector.sed Vector.cxx >NCVector.cxx
chmod -w NCVector.cxx
