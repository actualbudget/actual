// Derived from comp.sources.unix/volume3/att_getopt.

#ifndef Options_DEF_INCLUDED
#define Options_DEF_INCLUDED 1

#ifndef OPTION_CHAR
#define OPTION_CHAR T('-')
#endif

#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif

template<class T>
Options<T>::Options(int argc, T *const *argv, const Vector<LongOption<T> > &l)
: argc_(argc), argv_(argv), ind_(1), sp_(1), opts_(l), optInd_(-1)
{
}

template<class T>
bool Options<T>::search(T c)
{
  for (optInd_ = 0; optInd_ < opts_.size(); optInd_++) 
    if (opts_[optInd_].key == c) 
      return 1;
  optInd_ = -1;
  return 0;
}

template<class T>
bool Options<T>::searchLong(const T *arg)
{
  /* return true if a unique match is found 
     set sp_ to the char ending the option name ('\0' or '=')
     set optInd_ to the index of the first match 
   */
  optInd_ = -1;
  for (size_t i = 0; i < opts_.size(); i++) 
    if (opts_[i].name) {
      const T *t;
      for (sp_ = 2, t = opts_[i].name; ; sp_++, t++) {
        if ((arg[sp_] == T('\0')) || (arg[sp_] == T('='))) {
          if (optInd_ >= 0)
            return 0; // ambiguous
          else {
            optInd_ = i;
            if (*t == T('\0'))
              return 1; // exact match
            else 
              break; // match, continue with next option
          }
        }
        else if (arg[sp_] != *t)
          break;  // no match, continue with next option
      }
    }
  return (optInd_ >= 0);
}

template<class T>
bool Options<T>::get(T &c)
{
  if (sp_ == 1) {
    if (ind_ >= argc_)
      return false;
    if ((argv_[ind_][0] != OPTION_CHAR) || argv_[ind_][1] == 0) 
      return false;
    if (argv_[ind_][0] == OPTION_CHAR && argv_[ind_][1] == OPTION_CHAR) {
      if (argv_[ind_][2] == 0) {
        ind_++;
        return false;
      }
      else {
        opt_ = 0; // this marks a long option
        if (searchLong(argv_[ind_])) {
          c = opts_[optInd_].value;
          if (opts_[optInd_].hasArgument) {
            if (argv_[ind_][sp_] == T('='))
              arg_ = &argv_[ind_][sp_ + 1];
            else if (ind_ + 1 < argc_)
              arg_ = argv_[++ind_];
            else
              c = T('?'); // missing argument
          }
          else if (argv_[ind_][sp_] == T('='))
            c = T('='); // erroneous argument
        }
        else if (optInd_ >= 0)
          c = T('-'); // ambiguous option
        else
          c = T('?'); // unknown option
        ind_++;
        sp_ = 1;
        return true;
      }
    }
  }
  opt_ = c = argv_[ind_][sp_];
  if (!search(c)) {
    if (argv_[ind_][++sp_] == 0) {
      ind_++;
      sp_ = 1;
    }
    c = T('?');
    return true;
  }
  if (optInd_ >= 0 && opts_[optInd_].hasArgument) {
    if (argv_[ind_][sp_ + 1] != 0)
      arg_ = &argv_[ind_++][sp_ + 1];
    else if (++ind_ >= argc_) {
      sp_ = 1;
      c = T('?');
      return true;
    }
    else
      arg_ = argv_[ind_++];
    sp_ = 1;
  } 
  else {
    if (argv_[ind_][++sp_] == 0) {
      sp_ = 1;
      ind_++;
    }
    arg_ = 0;
  }
  return true;
}

#ifdef SP_NAMESPACE
}
#endif

#endif /* not Options_DEF_INCLUDED */
