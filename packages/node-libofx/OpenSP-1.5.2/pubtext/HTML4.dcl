<!SGML  "ISO 8879:1986 (WWW)"
    --
         SGML Declaration for HyperText Markup Language version 4.0
 
         With support for the first 17 planes of ISO 10646 and
         increased limits for tag and literal lengths etc.

         Modified by jjc to work around SP's 16-bit character limit.
         Modified by jjc to support hex character references.
    --
 
    CHARSET
          BASESET  "ISO Registration Number 177//CHARSET
                    ISO/IEC 10646-1:1993 UCS-4 with
                    implementation level 3//ESC 2/5 2/15 4/6"
         DESCSET 0       9       UNUSED
                 9       2       9
                 11      2       UNUSED
                 13      1       13
                 14      18      UNUSED
                 32      95      32
                 127     1       UNUSED
                 128     32      UNUSED
              -- jjc: changed the rest of the DESCSET.
                 Note that surrogates are not declared UNUSED;
                 this allows non-BMP characters to be parsed. --
                 160     65376   160
              -- 160     55136   160
                 55296   2048    UNUSED
                 57344   1056768 57344 --

CAPACITY        SGMLREF
                TOTALCAP        150000
                GRPCAP          150000
                ENTCAP          150000

SCOPE    DOCUMENT
SYNTAX
         SHUNCHAR CONTROLS 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16
           17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 127
         BASESET  "ISO 646IRV:1991//CHARSET
                   International Reference Version
                   (IRV)//ESC 2/8 4/2"
         DESCSET  0 128 0

         FUNCTION
                  RE            13
                  RS            10
                  SPACE         32
                  TAB SEPCHAR    9

         NAMING   LCNMSTRT ""
                  UCNMSTRT ""
                  LCNMCHAR ".-_:"    
                  UCNMCHAR ".-_:"
                  NAMECASE GENERAL YES
                           ENTITY  NO
         DELIM    GENERAL  SGMLREF
                           HCRO "&#38;#X" -- added by jjc --
                  SHORTREF SGMLREF
         NAMES    SGMLREF
         QUANTITY SGMLREF
                  ATTCNT   60      -- increased --
                  ATTSPLEN 65536   -- These are the largest values --
                  LITLEN   65536   -- permitted in the declaration --
                  NAMELEN  65536   -- Avoid fixed limits in actual --
                  PILEN    65536   -- implementations of HTML UA's --
                  TAGLVL   100
                  TAGLEN   65536
                  GRPGTCNT 150
                  GRPCNT   64

FEATURES
  MINIMIZE
    DATATAG  NO
    OMITTAG  YES
    RANK     NO
    SHORTTAG YES
  LINK
    SIMPLE   NO
    IMPLICIT NO
    EXPLICIT NO
  OTHER
    CONCUR   NO
    SUBDOC   NO
    FORMAL   YES
  APPINFO NONE
>