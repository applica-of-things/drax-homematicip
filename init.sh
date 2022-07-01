#!/bin/bash

configPath="/root/config.json"
mail=$1
password=$2

if [ ! -f $configPath ]
then
        echo "touching config file..."
        touch $configPath
        echo "{" >> $configPath
        echo "   \"mail\": \"${mail}\"" >> $configPath
        echo "   \"password\": \"${password}\"" >> $configPath
        echo "}" >> $configPath
fi
chmod 777 $configPath