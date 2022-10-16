
1.2.1 / 2022-09-13
==================

**fixes**
  * [[`c316a04`](http://github.com/node-modules/address/commit/c316a044aedeadf438c2c2a7278d51f0861df8af)] - fix: local addresses should be ignored on interface (#32) (Jon Kelley <<jkelleyrtp@gmail.com>>)

**others**
  * [[`823b70c`](http://github.com/node-modules/address/commit/823b70c2f53ab96d6e25041aa444436d906c59ef)] - 🤖 TEST: Run test on GitHub action (#27) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`2b5fb44`](http://github.com/node-modules/address/commit/2b5fb44ca1ff1a0d64768e8d42845ec377b9e3f8)] - Create codeql-analysis.yml (fengmk2 <<fengmk2@gmail.com>>)

1.2.0 / 2022-04-29
==================

**features**
  * [[`fe81a41`](http://github.com/node-modules/address/commit/fe81a415403ba46d7bc09d76a2f9fc46bc2fc803)] - feat: address.ip() supports node 18 (#26) (Yuheng Zhang <<zhangyuheng91@gmail.com>>)

1.1.2 / 2019-08-26
==================

**fixes**
  * [[`304754e`](http://github.com/node-modules/address/commit/304754ea4ef0dd34db7ba34745f4f4543afc064c)] - fix: fix declarations (#20) (吖猩 <<whxaxes@qq.com>>)

1.1.1 / 2019-08-22
==================

**fixes**
  * [[`19884ff`](http://github.com/node-modules/address/commit/19884ffbe9ad75f9a66889a031db4b806da1f822)] - fix: update d.ts (#18) (MarioDu <<dujiakun@gmail.com>>)

1.1.0 / 2019-04-24
==================

**features**
  * [[`7544592`](http://github.com/node-modules/address/commit/75445923a6f737fc21e3cf592f749bf014b7b4ce)] - feat: Add typings (#15) (Mathieu TUDISCO <<oss@mathieutu.dev>>)

1.0.3 / 2017-08-24
==================

**fixes**
  * [[`ed491c5`](http://github.com/node-modules/address/commit/ed491c5bd353118e4e4d384f47f13c3e1cfeb80e)] - fix: ignore wrong mac address on node 8.x (#10) (fengmk2 <<fengmk2@gmail.com>>)

1.0.2 / 2017-05-26
==================

  * fix: win32 get mac failed (#9)

1.0.1 / 2016-09-30
==================

  * test: remove 0.12
  * fix: search interface before family match
  * add contributors

1.0.0 / 2015-08-06
==================

 * chore: use npm scripts instead of Makefile
 * add benchmark

0.0.3 / 2013-11-04 
==================

  * get the first not local ip when interface not exists

0.0.2 / 2013-08-08 
==================

  * use networkInterface() to get mac fix #3

0.0.1 / 2013-07-31 
==================

  * ip(), ipv6(), mac(), dns() work on osx and linux now.
  * first commit
