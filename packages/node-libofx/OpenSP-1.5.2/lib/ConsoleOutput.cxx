// Copyright (c) 1996 James Clark
// See the file COPYING for copying permission.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "ConsoleOutput.h"

#ifdef SP_WIDE_SYSTEM
#include <windows.h>
#include <io.h>
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

#ifdef SP_WIDE_SYSTEM

class ConsoleOutputCharStream : public OutputCharStream {
public:
  ConsoleOutputCharStream(HANDLE h);
  void flush();
  void flushBuf(Char);
private:
  HANDLE h_;
};

OutputCharStream *ConsoleOutput::makeOutputCharStream(int fd)
{
  HANDLE h = (HANDLE)_get_osfhandle(fd);
  DWORD flags;
  if (GetConsoleMode(h, &flags))
    return new ConsoleOutputCharStream(h);
  else
    return 0;
}

ConsoleOutputCharStream::ConsoleOutputCharStream(HANDLE h)
: h_(h)
{
}

void ConsoleOutputCharStream::flush()
{
}

void ConsoleOutputCharStream::flushBuf(Char c)
{
  DWORD nWritten;
  unsigned short ch = c;
  if (WriteConsoleW(h_, &ch, 1, &nWritten, 0))
    return;
  char buf[2];
  int nBytes = WideCharToMultiByte(CP_OEMCP, 0, &ch, 1, buf, 2, 0, 0);
  if (nBytes)
    WriteConsoleA(h_, buf, nBytes, &nWritten, 0);
}

#else /* not SP_WIDE_SYSTEM */

OutputCharStream *ConsoleOutput::makeOutputCharStream(int)
{
  return 0;
}

#endif  /* not SP_WIDE_SYSTEM */

#ifdef SP_NAMESPACE
}
#endif
