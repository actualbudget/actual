#! /usr/bin/perl

# Feed this ftp://unicode.org/MappingTables/UnicodeData-1.1.4.txt.

$compat_start = 0xfb00;

# Small Kana
$uc[12353] = 12354;
$is_uc[12354] = 1;
$uc[12355] = 12356;
$is_uc[12356] = 1;
$uc[12357] = 12358;
$is_uc[12358] = 1;
$uc[12359] = 12360;
$is_uc[12360] = 1;
$uc[12361] = 12362;
$is_uc[12362] = 1;
$uc[12387] = 12388;
$is_uc[12388] = 1;
$uc[12419] = 12420;
$is_uc[12420] = 1;
$uc[12421] = 12422;
$is_uc[12422] = 1;
$uc[12423] = 12424;
$is_uc[12424] = 1;
$uc[12430] = 12430;
$is_uc[12430] = 1;
$uc[12449] = 12450;
$is_uc[12450] = 1;
$uc[12451] = 12452;
$is_uc[12452] = 1;
$uc[12453] = 12454;
$is_uc[12454] = 1;
$uc[12455] = 12456;
$is_uc[12456] = 1;
$uc[12457] = 12458;
$is_uc[12458] = 1;
$uc[12483] = 12484;
$is_uc[12484] = 1;
$uc[12515] = 12516;
$is_uc[12516] = 1;
$uc[12517] = 12518;
$is_uc[12518] = 1;
$uc[12519] = 12520;
$is_uc[12520] = 1;
$uc[12526] = 12527;
$is_uc[12527] = 1;

while (<>) {
    next if /^#/;
    @F = split(';');
    $code = hex($F[0]);
    next if $code < 0x200c && $F[2] eq "Cc";
    $type[$code] = $F[2];
    # 0x17f maps to 0x53, but SGML doesn't allow that.
    if ($F[12] && hex($F[12]) > 128) {
	$uc[$code] = hex($F[12]);
	$is_uc[hex($F[12])] = 1;
    }
    if ($F[2] eq "Zs") {
	$name[$code] = $F[1];
    }
	
    if ($code == 0x4e00) {
	foreach $code (0x4e00 .. 0x9fa5) {
	    $type[$code] = $F[2];
	}
	foreach $code (0xf900 .. 0xfa2e) {
	    $type[$code] = $F[2];
	}
    }
}

print <<EOF;
SHUNCHAR CONTROLS
BASESET "ISO Registration Number 176//CHARSET
ISO/IEC 10646-1:1993 UCS-2 with implementation level 3//ESC 2/5 2/15 4/5"

DESCSET         0               65536   0        -- 16 bit --

FUNCTION        RE                      13
                RS                      10
                SPACE                   32       
                TAB             SEPCHAR 9
EOF

foreach $code (128 .. $#type) {
    if ($type[$code] eq "Zs") {
	$s = $name[$code];
	$s =~ s/ /-/g;
	print("\"$s\" SEPCHAR $code\n");
    }
}

print "NAMING\n";

$is_nmstrt{"Lu"} = 1;
$is_nmstrt{"Ll"} = 1;
$is_nmchar{"Lm"} = 1;
$is_nmstrt{"Lo"} = 1;
$is_nmchar{"Mn"} = 1;
$is_nmchar{"Mc"} = 1;
$is_nmchar{"Nd"} = 1;
$is_nmstrt{"No"} = 1;
$is_nmstrt{"Cc"} = 1; # >= 0x200c
$is_sr{"Cc"} = 1; # >= 0x200c
$is_sr{"Pd"} = 1;
$is_sr{"Ps"} = 1;
$is_sr{"Pe"} = 1;
$is_sr{"Po"} = 1;
$is_sr{"Sm"} = 1;
$is_sr{"Sc"} = 1;
$is_sr{"So"} = 1;
$is_sr{"Zs"} = 1;
$is_sr{"Zl"} = 1;
$is_sr{"Zp"} = 1;

print "LCNMSTRT\n";
foreach $code (128 .. $#type) {

    if ($uc[$code] && $code < $compat_start) {
	&output($code);
    }
    
}
&flush();

print "UCNMSTRT\n";

foreach $code (128 .. $#type) {
    if ($uc[$code] && $code < $compat_start) {
	&output($uc[$code]);
    }
    
}
&flush();

print "NAMESTRT\n";
foreach $code (128 .. $#type) {
    if (!$uc[$code] && !$is_uc[$code]
	&& $is_nmstrt{$type[$code]} && $code < $compat_start) {
	&output($code);
    }
    
}
&flush();

print "LCNMCHAR\n";
&output(ord("-"));
&output(ord("."));
&flush();

print "UCNMCHAR\n";
&output(ord("-"));
&output(ord("."));
&flush();

print "NAMECHAR\n";
foreach $code (128 .. $#type) {
    if ($is_nmchar{$type[$code]} && $code < $compat_start) {
	&output($code);
    }
    
}
&flush();

print <<EOF;
NAMECASE   GENERAL    YES
           ENTITY     NO
DELIM      GENERAL    SGMLREF
	   SHORTREF   SGMLREF
EOF

foreach $code (128 .. $#type) {
    if ($is_sr{$type[$code]}) {
	&output($code);
    }
    
}

&flush;

print <<EOF;
NAMES           SGMLREF 

QUANTITY        SGMLREF         -- To be determined --
        ATTSPLEN        1920    -- ?? --
        LITLEN          240     -- ?? --
        NAMELEN         240     -- ?? --
        PILEN           1920    -- ?? --
        TAGLEN          1920    -- ?? --
EOF


sub output {
    $ch = $_[0];
    if ($pending > 0 && $base + $pending == $ch) {
	$pending++;
    }
    else {
	&flush;
	$base = $ch;
	$pending = 1;
    }
}

sub flush {
    if ($pending > 0) {
	printf("%d", $base);
	if ($pending > 1) {
	    if ($pending > 2) {
		print "-";
	    }
	    else {
		print "\n";
	    }
	    printf("%d", $base + ($pending - 1));
	}
	print "\n";
	$count += $pending;
	$pending = 0;
    }
}

