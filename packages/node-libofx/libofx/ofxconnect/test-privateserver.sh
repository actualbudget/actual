#/bin/sh
#
# End-to-end test using the private server 
#

#
# Extract the login information from the encrypted file
#

# $serverlogin will include the --user --pass and --url options for the
# private ofx server
export serverlogin="`gpg -d login-privateserver.asc` --org=ReferenceFI --fid=00000 --bank=000000000 --broker=brokerdomain.com"

#
# Test a payment
#

#./ofxconnect -p $serverlogin --acct=10001010 --type=1 tmpfilex && cat tmpfilex

#
# Test a payment status inquiry
#

#./ofxconnect -i $serverlogin --trid=21384 tmpfilex && cat tmpfilex

#exit

#
# Test the list of accounts
#

#./ofxconnect -a $serverlogin tmpfilex && ../ofxdump/ofxdump tmpfilex


#
# Test checking accounts
#

./ofxconnect -s $serverlogin --acct=10001010 --type=1 --past=90 tmpfilex && ../ofxdump/ofxdump tmpfilex
exit
./ofxconnect -s $serverlogin --acct=10001001 --type=1 --past=90 tmpfilex && ../ofxdump/ofxdump tmpfilex
./ofxconnect -s $serverlogin --acct=10001002 --type=1 --past=90 tmpfilex && ../ofxdump/ofxdump tmpfilex
./ofxconnect -s $serverlogin --acct=10003001 --type=1 --past=90 tmpfilex && ../ofxdump/ofxdump tmpfilex

#
# Test investment accounts
#

./ofxconnect -s $serverlogin --acct=20001001 --type=2 --past=90 tmpfilex && ../ofxdump/ofxdump tmpfilex
./ofxconnect -s $serverlogin --acct=10001010 --type=2 --past=90 tmpfilex && ../ofxdump/ofxdump tmpfilex
./ofxconnect -s $serverlogin --acct=10001001 --type=2 --past=90 tmpfilex && ../ofxdump/ofxdump tmpfilex
./ofxconnect -s $serverlogin --acct=10001401 --type=2 --past=90 tmpfilex && ../ofxdump/ofxdump tmpfilex
./ofxconnect -s $serverlogin --acct=10001000 --type=2 --past=90 tmpfilex && ../ofxdump/ofxdump tmpfilex
./ofxconnect -s $serverlogin --acct=20001001 --type=2 --past=90 tmpfilex && ../ofxdump/ofxdump tmpfilex

#
# These don't work yet because I mistakenly put "CHECKING" in for all "BANK" statments as the account type :-(
#

# --acct=10001003 --type=1 --past=90
# --acct=10001004 --type=1 --past=90
# --acct=10001005 --type=1 --past=90

#
# This one throws an ofx.ValidationException.  However, the other investment accounts work fine!!
#

# --acct=10002000 --type=2 --past=90
