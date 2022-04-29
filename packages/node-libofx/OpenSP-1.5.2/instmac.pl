#! /bin/perl -w
#
# Copyright (c) 1999 Avi Kivity
# instmac.pl --  generate template instantiations
#                derived from James Clark's instmac.m4
#

$index = 0;
$func_index = 0;

sub header
    {
    print <<__HEADER__;
#ifdef SP_NAMESPACE
namespace SP_NAMESPACE {
#endif


#ifdef SP_NAMESPACE
}
#endif
__HEADER__
    }

sub instantiate
    {
    my ($class) = @_;
    print <<__INSTANTIATION__;
#ifdef __DECCXX
#pragma define_template $class
#else
#ifdef __xlC__
#pragma define($class)
#else
#ifdef SP_ANSI_CLASS_INST
template class $class;
#else
typedef $class Dummy_$index;
#endif
#endif
#endif
__INSTANTIATION__
    ++$index;
    }

sub func_instantiate
    {
    my ($a1, $a2, $a3, $a4) = @_;
    print <<__FUNC_INSTANTIATION__;
#ifdef __GNUG__
template void $a1($a2, $a3, $a4);
#else
static
void  func_$func_index ($a2 arg1, $a3 arg2, $a4 arg3) {
(void)$a1(arg1, arg2, arg3);
}
#endif
__FUNC_INSTANTIATION__
    ++$func_index;
    }

header;
while (<ARGV>)
    {
    if (/^__instantiate\((.*)\)\s*$/)
        {
        $arg = $1;
        $arg = $1 if /`(.*)'/;
        instantiate $arg;
        }
    elsif (/^__instantiate\((.*)\)\s*$/)
        {
        die "instantiate_func3 found!";
        }
    else
        {
        print;
        }
    }
