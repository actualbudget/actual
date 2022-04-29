<!SGML  "ISO 8879:1986"
   --
        SGML Declaration for HyperText Markup Language version 3.2

        With support for ISO Latin-1 and increased limits
        for tag and literal lengths etc.
   --

   CHARSET
         BASESET  "ISO 646:1983//CHARSET
                   International Reference Version
                   (IRV)//ESC 2/5 4/0"
         DESCSET  0   9   UNUSED
                  9   2   9
                  11  2   UNUSED
                  13  1   13
                  14  18  UNUSED
                  32  95  32
                  127 1   UNUSED
         BASESET  "ISO Registration Number 100//CHARSET
                   ECMA-94 Right Part of
                   Latin Alphabet Nr. 1//ESC 2/13 4/1"
         DESCSET  128  32   UNUSED
                  160  96    32

   CAPACITY   SGMLREF
              TOTALCAP        200000
              GRPCAP          150000
              ENTCAP          150000

   SCOPE    DOCUMENT
   SYNTAX
      SHUNCHAR CONTROLS 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16
              17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 127
      BASESET  "ISO 646:1983//CHARSET
                International Reference Version
                (IRV)//ESC 2/5 4/0"
      DESCSET  0 128 0

      FUNCTION
              RE            13
              RS            10
              SPACE         32
              TAB SEPCHAR    9

      NAMING   LCNMSTRT ""
               UCNMSTRT ""
               LCNMCHAR ".-"
               UCNMCHAR ".-"
               NAMECASE GENERAL YES
                        ENTITY  NO
      DELIM    GENERAL  SGMLREF
               SHORTREF SGMLREF
      NAMES    SGMLREF
      QUANTITY SGMLREF
               ATTSPLEN 65536
               LITLEN   65536
               NAMELEN  65536
               PILEN    65536
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
   APPINFO      NONE
>
