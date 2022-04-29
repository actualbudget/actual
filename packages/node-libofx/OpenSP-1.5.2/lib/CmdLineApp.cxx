// Copyright (c) 1996 James Clark, 1999 Matthias Clasen
// See the file COPYING for copying permission.

// Need option registration method that allows derived class to change
// option names.

#ifdef __GNUG__
#pragma implementation
#endif

#include "splib.h"
#include "CmdLineApp.h"
#include "CmdLineAppMessages.h"
#include "MessageArg.h"
#include "ErrnoMessageArg.h"
#include "Options.h"
#include "xnew.h"
#include "macros.h"
#include "sptchar.h"
#include "MessageTable.h"
#include "CodingSystemKit.h"

#include "ConsoleOutput.h"

#include <errno.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>

#ifdef SP_HAVE_LOCALE
#include <locale.h>
#endif
#ifdef SP_HAVE_SETMODE
#include <fcntl.h>
#include <io.h>
#endif

#include <sys/types.h>
#ifdef SP_INCLUDE_UNISTD_H
#include <unistd.h>
#endif
#ifdef SP_INCLUDE_IO_H
#include <io.h>
#endif

#ifdef _MSC_VER
#include <crtdbg.h>
#endif

#ifndef SP_DEFAULT_ENCODING
#ifdef WIN32
#define SP_DEFAULT_ENCODING SP_T("WINDOWS")
#else
#define SP_DEFAULT_ENCODING  SP_T("IS8859-1")
#endif
#endif /* not SP_DEFAULT_ENCODING */

#ifndef SP_MESSAGE_DOMAIN
#define SP_MESSAGE_DOMAIN ""
#endif /* not SP_MESSAGE_DOMAIN */

#ifndef SP_LOCALE_DIR
#define SP_LOCALE_DIR ""
#endif /* not SP_LOCALE_DIR */

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

static const SP_TCHAR *progName = 0;

static FileOutputByteStream standardOutput(1, 0);
static FileOutputByteStream standardError(2, 0);

CmdLineApp::CmdLineApp(const char *requiredInternalCode)
: errorFile_(0),
  outputCodingSystem_(0),
  SP_REPORTER_CLASS(0),
  internalCharsetIsDocCharset_(1),
  codingSystem_(0),
  action_(normalAction)
{
  initCodingSystem(requiredInternalCode);
  setMessageStream(makeStdErr());
  if (internalCharsetIsDocCharset_) 
    registerOption('b', SP_T("bctf"), 
                   CmdLineAppMessages::name, CmdLineAppMessages::bHelp);
  else
    registerOption('b', SP_T("encoding"), 
                   CmdLineAppMessages::name, CmdLineAppMessages::eHelp);
  registerOption('f', SP_T("error-file"), 
                 CmdLineAppMessages::file, CmdLineAppMessages::fHelp);
  registerOption('v', SP_T("version"), CmdLineAppMessages::vHelp);
  registerOption('h', SP_T("help"), CmdLineAppMessages::hHelp);
  registerInfo(CmdLineAppMessages::usageStart, 1);
}

void CmdLineApp::resetCodingSystemKit()
{
  codingSystemKit_ = codingSystemKit_->copy();
}

void CmdLineApp::registerOption(AppChar c, const AppChar *name,
                                const MessageType1 &doc)
{
  registerOption(c, name, CmdLineAppMessages::noArg, doc);
}

void CmdLineApp::changeOptionRegistration(AppChar oldc, AppChar newc)
{
  for (size_t i = 0; i < opts_.size(); i++) {
    if (opts_[i].value == oldc) {
      opts_[i].value = newc;
#ifdef SP_HAVE_LOCALE
      char *savedLocale = strdup(setlocale(LC_CTYPE, NULL));
      setlocale(LC_CTYPE, "C");
#endif
      opts_[i].key = istalnum(newc) ? newc : 0;
#ifdef SP_HAVE_LOCALE
      setlocale(LC_CTYPE, savedLocale);
      if (savedLocale)
        free(savedLocale);
#endif
      return;
    }
  }
}

void CmdLineApp::registerOption(AppChar c, const AppChar *name,
				const MessageFragment &arg,
                                const MessageType1 &doc)
{
  // these four are used for signals from Options<>::get()
  ASSERT((c != '-') && (c != ':') && (c != '?') && (c != '=')); 
  LongOption<AppChar> opt;
  opt.value = c;
#ifdef SP_HAVE_LOCALE
  char *savedLocale = strdup(setlocale(LC_CTYPE, NULL));
  setlocale(LC_CTYPE, "C");
#endif
  opt.key = istalnum(c) ? c : 0;
#ifdef SP_HAVE_LOCALE
  setlocale(LC_CTYPE, savedLocale);
  if (savedLocale)
    free(savedLocale);
#endif
  opt.name = name;
  opt.hasArgument = (arg.module() != CmdLineAppMessages::noArg.module()
                    || arg.number() != CmdLineAppMessages::noArg.number());
  for (size_t i = 0; i < opts_.size(); i++) 
    if (opts_[i].value == c) {
      for (; i + 1 < opts_.size(); i++) {
        opts_[i] = opts_[i + 1]; 
        optArgs_[i] = optArgs_[i + 1];
        optDocs_[i] = optDocs_[i + 1];
      }
      opts_[i] = opt;
      optArgs_[i] = arg; 
      optDocs_[i] = doc;
      return;
    }
  opts_.push_back(opt);
  optArgs_.push_back(arg);
  optDocs_.push_back(doc);
}

void CmdLineApp::registerUsage(const MessageType1 &u)
{
  usages_.push_back(u);
}

void CmdLineApp::registerInfo(const MessageType1 &i, bool pre)
{
  if (pre)
    preInfos_.push_back(i);
  else
    infos_.push_back(i);
}

// Backward compability. Will not display argName.
void CmdLineApp::registerOption(AppChar c, const AppChar *argName)
{
  if (argName)
    registerOption(c, 0, CmdLineAppMessages::someArg,
		   CmdLineAppMessages::undocOption);
  else
    registerOption(c, 0, CmdLineAppMessages::undocOption);
}

void CmdLineApp::usage()
{
  const OutputCharStream::Newline nl = OutputCharStream::newline;
  // We use the default encoding for the help message, since this is consistent
  // with error messages and probably is what users want.
  Owner<OutputCharStream> stdOut(ConsoleOutput::makeOutputCharStream(1));
  if (!stdOut)
    stdOut = new EncodeOutputCharStream(&standardOutput, codingSystem());

  Vector<CopyOwner<MessageArg> > args(1);
  StringMessageArg arg(convertInput(progName ? progName : SP_T("program")));
  args[0] = arg.copy();
  if (usages_.size() == 0) 
    usages_.push_back(CmdLineAppMessages::defaultUsage);
  for (size_t i = 0; i < usages_.size(); i++) {
    StrOutputCharStream ostr;
    StringC tem;
    formatMessage(usages_[i], args, ostr, 1);
    ostr.extractString(tem); 
    Vector<CopyOwner<MessageArg> > args2(1);
    StringMessageArg arg2(tem);
    args2[0] = arg2.copy();
    formatMessage(i ? CmdLineAppMessages::usageCont 
		  : CmdLineAppMessages::usage,
		  args2, *stdOut, 1);
    *stdOut << nl;
  } 

  for (size_t i = 0; i < preInfos_.size(); i++) {
    formatMessage(preInfos_[i], args, *stdOut, 1);
    *stdOut << nl;
  }
  Vector<StringC> leftSide;
  size_t leftSize = 0;
  for (size_t i = 0; i < opts_.size(); i++) {
    leftSide.resize(leftSide.size() + 1);
    StringC& s = leftSide.back();
    static const AppChar* space2 = SP_T("  ");
    s += convertInput(space2);
    if (opts_[i].key) {
      static const AppChar* dash = SP_T("-");
      s += convertInput(dash);
      AppChar buf[2];
      buf[0] = opts_[i].key;
      buf[1] = SP_T('\0');
      s += convertInput(buf);
      if (opts_[i].name) {
	static const AppChar* commaSpace = SP_T(", ");
	s += convertInput(commaSpace);
      }
      else if (opts_[i].hasArgument) {
	buf[0] = ' ';
	s += convertInput(buf);
      }
    }
    if (opts_[i].name) {
      static const AppChar* dash2 = SP_T("--");
      s += convertInput(dash2);
      s += convertInput(opts_[i].name);
      if (opts_[i].hasArgument) {
	static const AppChar* equal = SP_T("=");
	s += convertInput(equal);
      }
    }
    if (opts_[i].hasArgument) {
      StringC tem;
      getMessageText(optArgs_[i], tem);
      s += tem;
    }
    if (s.size() > leftSize)
      leftSize = s.size();
  }
  leftSize += 2;
  for (size_t i = 0; i < opts_.size(); i++) {
    for (size_t j = leftSide[i].size(); j <= leftSize; j++)
      leftSide[i] += ' ';
    StrOutputCharStream ostr;
    Vector<CopyOwner<MessageArg> > args2(1);
    StringC t;
    if (!getMessageText(optArgs_[i], t))
      t.resize(0);
    StringMessageArg arg(t);
    args2[0] = arg.copy(); 
    formatMessage(optDocs_[i], args2, ostr, 1);
    StringC tem;
    ostr.extractString(tem);
    *stdOut << leftSide[i] << tem << nl;
  }
  for (size_t i = 0; i < infos_.size(); i++) {
    formatMessage(infos_[i], args, *stdOut, 1);
    *stdOut << nl;
  }
}

static
void ewrite(const char *s)
{
  int n = (int)strlen(s);
  while (n > 0) {
    int nw = write(2, s, n);
    if (nw < 0)
      break;
    n -= nw;
    s += nw;
  }
}

static
#ifdef SP_FANCY_NEW_HANDLER
int outOfMemory(size_t)
#else
void outOfMemory()
#endif
{
  ewrite("SP library: out of memory\n");
  exit(1);
#ifdef SP_FANCY_NEW_HANDLER
  return 0;
#endif  
}

int CmdLineApp::init(int, AppChar **argv)
{
#ifndef SP_ANSI_LIB
  set_new_handler(outOfMemory);
#endif
#ifdef SP_HAVE_LOCALE
  setlocale(LC_ALL, "");
#endif
#ifdef SP_HAVE_SETMODE
  _setmode(1, _O_BINARY);
  _setmode(2, _O_BINARY);
#endif
  progName = argv[0];
  if (progName)
    setProgramName(convertInput(progName));
  MessageTable::instance()->registerMessageDomain(libModule,
                                                  SP_MESSAGE_DOMAIN, 
                                                  SP_LOCALE_DIR);
  MessageTable::instance()->registerMessageDomain(appModule,
                                                  SP_MESSAGE_DOMAIN, 
                                                  SP_LOCALE_DIR);
  return 0;
}

int CmdLineApp::run(int argc, AppChar **argv)
{
#ifdef _MSC_VER
  _CrtSetDbgFlag(_CRTDBG_ALLOC_MEM_DF|_CRTDBG_LEAK_CHECK_DF);
#endif
#ifdef SP_ANSI_LIB
  try {
#endif
  int ret = init(argc, argv);
  if (ret)
    return ret;
  int firstArg;
  ret = processOptions(argc, argv, firstArg);
  if (ret)
    return ret;
  // We do this here, so that the -b option works even if it is present after
  // the -h option.
  if (action_ == usageAction) {
    usage();
    return 0;
  }
  ret = processArguments(argc - firstArg, argv + firstArg);
  progName = 0;
  return ret;
#ifdef SP_ANSI_LIB
  }
catch (
#ifndef SP_NO_STD_NAMESPACE
       std::
#endif
	    bad_alloc) {
#ifdef SP_FANCY_NEW_HANDLER
    outOfMemory(0);
#else
    outOfMemory();
#endif
  }
  return 1;
#endif /* SP_ANSI_LIB */
}    

int CmdLineApp::processOptions(int argc, AppChar **argv, int &nextArg)
{
  AppChar ostr[80];
  Options<AppChar> options(argc, argv, opts_);
  AppChar opt;
  while (options.get(opt)) {
    switch (opt) {
    case '-':
    case '?':
    case '=':
    case ':':
      if (options.opt() == 0) {
        size_t i;
        const AppChar *t;
        for (i = 0, t = &argv[options.ind() - 1][2]; i < 79; i++, t++) {
          if  ((*t == '=') || (*t == '\0'))
            break;
          ostr[i] = *t;
        }
        ostr[i] = '\0';
      } 
      else {
        ostr[0] = options.opt();
        ostr[1] = SP_T('\0');
      }
      message((opt == '-') ? CmdLineAppMessages::ambiguousOptionError
               : ((opt == '=') ? CmdLineAppMessages::erroneousOptionArgError
               : ((opt == ':') ? CmdLineAppMessages::missingOptionArgError
               : CmdLineAppMessages::invalidOptionError)),
	      StringMessageArg(convertInput(ostr)));
      message(CmdLineAppMessages::tryHelpOptionForInfo);
      return 1;
    default:
      processOption(opt, options.arg());
      break;
    }
  }
  nextArg = options.ind();
  if (errorFile_) {
    static FileOutputByteStream file;
    if (!file.open(errorFile_)) {
      message(CmdLineAppMessages::openFileError,
	      StringMessageArg(convertInput(errorFile_)),
	      ErrnoMessageArg(errno));
      return 1;
    }
    setMessageStream(new EncodeOutputCharStream(&file, codingSystem()));
  }
  if (!outputCodingSystem_)
    outputCodingSystem_ = codingSystem();
  return 0;
}

void CmdLineApp::processOption(AppChar opt, const AppChar *arg)
{
  switch (opt) {
  case 'b':
    outputCodingSystem_ = lookupCodingSystem(arg);
    if (!outputCodingSystem_)
      message(internalCharsetIsDocCharset_
	      ? CmdLineAppMessages::unknownBctf
	      : CmdLineAppMessages::unknownEncoding,
	      StringMessageArg(convertInput(arg)));
    break;
  case 'f':
    errorFile_ = arg;
    break;
  case 'v':
    // print the version number
    message(CmdLineAppMessages::versionInfo,
	    StringMessageArg(codingSystem()->convertIn(SP_PACKAGE)),
	    StringMessageArg(codingSystem()->convertIn(SP_VERSION)));
    break;
  case 'h':
    action_ = usageAction;
    break;
  default:
    CANNOT_HAPPEN();
  }
}

Boolean CmdLineApp::getMessageText(const MessageFragment &frag,
				   StringC &text)
{
  String<SP_TCHAR> str;
  if (!MessageTable::instance()->getText(frag, str))
    return 0;
#ifdef SP_WIDE_SYSTEM
  text.resize(str.size());
  for (size_t i = 0; i < str.size(); i++)
    text[i] = Char(str[i]);
#else
  str += 0;
  text = codingSystem()->convertIn(str.data());
#endif
  return 1;
}

Boolean CmdLineApp::stringMatches(const SP_TCHAR *s, const char *key)
{
  for (; *key != '\0'; s++, key++) {
    if (*s != tolower(*key) && *s != toupper(*key))
      return 0;
  }
  return *s == '\0';
}

void CmdLineApp::initCodingSystem(const char *requiredInternalCode)
{
  const char *name = requiredInternalCode;
#ifdef SP_MULTI_BYTE
  char buf[256];
  if (!name) {
    const SP_TCHAR *internalCode = tgetenv(SP_T("SP_SYSTEM_CHARSET"));
    if (internalCode) {
      buf[255] = '\0';
      for (size_t i = 0; i < 255; i++) {
	buf[i] = internalCode[i];
	if (buf[i] == '\0')
	  break;
      }
      name = buf;
    }
  }
  if (requiredInternalCode)
    internalCharsetIsDocCharset_ = 0;
  else {
    const SP_TCHAR *useInternal = tgetenv(SP_T("SP_CHARSET_FIXED"));
    if (useInternal
        && (stringMatches(useInternal, "YES")
	    || stringMatches(useInternal, "1")))
      internalCharsetIsDocCharset_ = 0;
  }
#endif /* SP_MULTI_BYTE */
  codingSystemKit_ = CodingSystemKit::make(name);
  const SP_TCHAR *codingName = tgetenv(internalCharsetIsDocCharset_
				       ? SP_T("SP_BCTF")
				       : SP_T("SP_ENCODING"));
  if (codingName)
    codingSystem_ = lookupCodingSystem(codingName);
#ifdef SP_MULTI_BYTE
  if (!codingSystem_ && !internalCharsetIsDocCharset_)
    codingSystem_ = lookupCodingSystem(SP_DEFAULT_ENCODING);
#endif
  if (!codingSystem_
#ifndef SP_WIDE_SYSTEM
      || codingSystem_->fixedBytesPerChar() > 1
#endif
    )
    codingSystem_ = codingSystemKit_->identityCodingSystem();
}

const CodingSystem *
CmdLineApp::lookupCodingSystem(const AppChar *codingName)
{
#define MAX_CS_NAME 50
  if (tcslen(codingName) < MAX_CS_NAME) {
    char buf[MAX_CS_NAME];
    int i;
    for (i = 0; codingName[i] != SP_T('\0'); i++) {
      SP_TUCHAR c = codingName[i];
#ifdef SP_WIDE_SYSTEM
      if (c > (unsigned char)-1)
	return 0;
#endif
      buf[i] = char(c);
    }
    buf[i] = '\0';
    return codingSystemKit_->makeCodingSystem(buf, internalCharsetIsDocCharset_);
  }
  return 0;
}

StringC CmdLineApp::convertInput(const SP_TCHAR *s)
{
#ifdef SP_WIDE_SYSTEM
  StringC str;
  for (size_t i = 0; i < tcslen(s); i++)
    str += Char(s[i]);
#else
  StringC str(codingSystem()->convertIn(s));
#endif
  for (size_t i = 0; i < str.size(); i++)
    if (str[i] == '\n')
      str[i] = '\r';
  return str;
}

OutputCharStream *CmdLineApp::makeStdErr()
{
  OutputCharStream *os = ConsoleOutput::makeOutputCharStream(2);
  if (os)
    return os;
  return new EncodeOutputCharStream(&standardError, codingSystem());
}

OutputCharStream *CmdLineApp::makeStdOut()
{
  OutputCharStream *os = ConsoleOutput::makeOutputCharStream(1);
  if (os)
    return os;
  return new EncodeOutputCharStream(&standardOutput, outputCodingSystem_);
}

const MessageType2 &CmdLineApp::openFileErrorMessage()
{
  return CmdLineAppMessages::openFileError;
}

const MessageType2 &CmdLineApp::closeFileErrorMessage()
{
  return CmdLineAppMessages::closeFileError;
}

#ifdef SP_NAMESPACE
}
#endif
