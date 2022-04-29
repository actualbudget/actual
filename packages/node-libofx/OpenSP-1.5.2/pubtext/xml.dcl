<!SGML "ISO 8879:1986 (WWW)"

     -- SGML Declaration for XML 1.0 --

     -- from: 
        Final text of revised Web SGML Adaptations Annex (TC2) to ISO 8879:1986
        ISO/IEC JTC1/SC34 N0029: 1998-12-06
        Annex L.2 (informative): SGML Declaration for XML

        changes made to accommodate validation are noted with 'VALID:'
     --

     CHARSET
         BASESET
             "ISO Registration Number 177//CHARSET
              ISO/IEC 10646-1:1993 UCS-4 with implementation
              level 3//ESC 2/5 2/15 4/6"
         DESCSET
                 0        9  UNUSED
                 9        2       9
                11        2  UNUSED
                13        1      13
                14       18  UNUSED
                32       95      32
               127        1  UNUSED
               128       32  UNUSED
               160    55136     160
             55296     2048  UNUSED  -- surrogates --
             57344     8190   57344
             65534        2  UNUSED  -- FFFE and FFFF --
             65536  1048576   65536

     CAPACITY NONE  -- Capacities are not restricted in XML --

     SCOPE DOCUMENT

     SYNTAX
         SHUNCHAR NONE
         BASESET "ISO Registration Number 177//CHARSET
                  ISO/IEC 10646-1:1993 UCS-4 with implementation
                  level 3//ESC 2/5 2/15 4/6"
         DESCSET
             0 1114112 0
         FUNCTION
             RE    13
             RS    10
             SPACE 32
             TAB   SEPCHAR 9
         NAMING
             LCNMSTRT ""
             UCNMSTRT ""
             NAMESTRT
                 58 95 192-214 216-246 248-305 308-318 321-328
                 330-382 384-451 461-496 500-501 506-535 592-680
                 699-705 902 904-906 908 910-929 931-974 976-982
                 986 988 990 992 994-1011 1025-1036 1038-1103
                 1105-1116 1118-1153 1168-1220 1223-1224
                 1227-1228 1232-1259 1262-1269 1272-1273
                 1329-1366 1369 1377-1414 1488-1514 1520-1522
                 1569-1594 1601-1610 1649-1719 1722-1726
                 1728-1742 1744-1747 1749 1765-1766 2309-2361
                 2365 2392-2401 2437-2444 2447-2448 2451-2472
                 2474-2480 2482 2486-2489 2524-2525 2527-2529
                 2544-2545 2565-2570 2575-2576 2579-2600
                 2602-2608 2610-2611 2613-2614 2616-2617
                 2649-2652 2654 2674-2676 2693-2699 2701
                 2703-2705 2707-2728 2730-2736 2738-2739
                 2741-2745 2749 2784 2821-2828 2831-2832
                 2835-2856 2858-2864 2866-2867 2870-2873 2877
                 2908-2909 2911-2913 2949-2954 2958-2960
                 2962-2965 2969-2970 2972 2974-2975 2979-2980
                 2984-2986 2990-2997 2999-3001 3077-3084
                 3086-3088 3090-3112 3114-3123 3125-3129
                 3168-3169 3205-3212 3214-3216 3218-3240
                 3242-3251 3253-3257 3294 3296-3297 3333-3340
                 3342-3344 3346-3368 3370-3385 3424-3425
                 3585-3630 3632 3634-3635 3648-3653 3713-3714
                 3716 3719-3720 3722 3725 3732-3735 3737-3743
                 3745-3747 3749 3751 3754-3755 3757-3758 3760
                 3762-3763 3773 3776-3780 3904-3911 3913-3945
                 4256-4293 4304-4342 4352 4354-4355 4357-4359
                 4361 4363-4364 4366-4370 4412 4414 4416 4428
                 4430 4432 4436-4437 4441 4447-4449 4451 4453
                 4455 4457 4461-4462 4466-4467 4469 4510 4520
                 4523 4526-4527 4535-4536 4538 4540-4546 4587
                 4592 4601 7680-7835 7840-7929 7936-7957
                 7960-7965 7968-8005 8008-8013 8016-8023 8025
                 8027 8029 8031-8061 8064-8116 8118-8124 8126
                 8130-8132 8134-8140 8144-8147 8150-8155
                 8160-8172 8178-8180 8182-8188 8486 8490-8491
                 8494 8576-8578 12295 12321-12329 12353-12436
                 12449-12538 12549-12588 19968-40869 44032-55203

             LCNMCHAR ""
             UCNMCHAR ""
             NAMECHAR
                 45-46 183 720-721 768-837 864-865 903 1155-1158
                 1425-1441 1443-1465 1467-1469 1471 1473-1474
                 1476 1600 1611-1618 1632-1641 1648 1750-1764
                 1767-1768 1770-1773 1776-1785 2305-2307 2364
                 2366-2381 2385-2388 2402-2403 2406-2415
                 2433-2435 2492 2494-2500 2503-2504 2507-2509
                 2519 2530-2531 2534-2543 2562 2620 2622-2626
                 2631-2632 2635-2637 2662-2673 2689-2691 2748
                 2750-2757 2759-2761 2763-2765 2790-2799
                 2817-2819 2876 2878-2883 2887-2888 2891-2893
                 2902-2903 2918-2927 2946-2947 3006-3010
                 3014-3016 3018-3021 3031 3047-3055 3073-3075
                 3134-3140 3142-3144 3146-3149 3157-3158
                 3174-3183 3202-3203 3262-3268 3270-3272
                 3274-3277 3285-3286 3302-3311 3330-3331
                 3390-3395 3398-3400 3402-3405 3415 3430-3439
                 3633 3636-3642 3654-3662 3664-3673 3761
                 3764-3769 3771-3772 3782 3784-3789 3792-3801
                 3864-3865 3872-3881 3893 3895 3897 3902-3903
                 3953-3972 3974-3979 3984-3989 3991 3993-4013
                 4017-4023 4025 8400-8412 8417 12293 12330-12335
                 12337-12341 12441-12442 12445-12446 12540-12542

             NAMECASE
                 GENERAL NO
                 ENTITY  NO
         DELIM
             GENERAL  SGMLREF
             HCRO     "&#38;#x"
                      -- Ampersand followed by "#x" (without quotes) --
             NESTC    "/"
             NET      ">"
             PIC      "?>"
             SHORTREF NONE

         NAMES
             SGMLREF

         QUANTITY
             NONE -- Quantities are not restricted in XML --

         ENTITIES
             "amp"  38
             "lt"   60
             "gt"   62
             "quot" 34
             "apos" 39

     FEATURES
         MINIMIZE
             DATATAG NO
             OMITTAG NO
             RANK    NO
             SHORTTAG
                 STARTTAG
                     EMPTY    NO
                     UNCLOSED NO
                     NETENABL IMMEDNET
                 ENDTAG
                     EMPTY    NO
                     UNCLOSED NO
                 ATTRIB
                     DEFAULT  YES
                     OMITNAME NO
                     VALUE    NO
             EMPTYNRM  YES
             IMPLYDEF
                 ATTLIST  NO  -- VALID: was YES --
                 DOCTYPE  NO
                 ELEMENT  NO  -- VALID: was YES --
                 ENTITY   NO
                 NOTATION NO  -- VALID: was YES --
         LINK
             SIMPLE   NO
             IMPLICIT NO
             EXPLICIT NO
         OTHER
             CONCUR   NO
             SUBDOC   NO
             FORMAL   NO
             URN      NO
             KEEPRSRE YES
             VALIDITY TYPE -- VALID: was NOASSERT --
             ENTITIES
                 REF      ANY
                 INTEGRAL YES

     APPINFO NONE

     SEEALSO "ISO 8879//NOTATION Extensible Markup Language (XML) 1.0//EN"
>
<!-- $Id: xml.dcl,v 1.2.2.1 2002/07/07 16:42:03 tbe Exp $ -->

