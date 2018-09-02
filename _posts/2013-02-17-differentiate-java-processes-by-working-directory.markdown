---
layout: single
title: "Differentiate Java Processes by Working Directory"
author_profile: true
date: 2013-02-17
tags: [java, linux, shell, stackify]
---

A lot of server software runs on Java, but the different Java processes are listed as simply `Java` via commands like `top` or `ps -ef`. One feature of the [Stackify](http://www.stackify.com) agent is tracking the running processes on a server. I needed a way to identify what each Java process really was in a fairly simple and concise way, but there isn’t a clear winner in the output of the top or ps commands.

Running `ps -ef | grep java` will output something nasty, similar to what follows. You can likely figure out what the Java process is actually running from the args — the example below obviously being tomcat — however, it’s not the most readable and doesn’t give a clear and concise value to display to a user in the Stackify web site. The user of the process below also indicates that it is running tomcat, but that won’t be the case for all Java processes.

```text
tomcat7 41298 1 5 18:05 ? 00:00:03 /usr/lib/jvm/default-java/bin/java -Djava.util.logging.config.file=/var/lib/tomcat7/conf/logging.properties -Djava.awt.headless=true -Xmx128m -XX:+UseConcMarkSweepGC -Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager -Djava.endorsed.dirs=/usr/share/tomcat7/endorsed -classpath /usr/share/tomcat7/bin/bootstrap.jar:/usr/share/tomcat7/bin/tomcat-juli.jar -Dcatalina.base=/var/lib/tomcat7 -Dcatalina.home=/usr/share/tomcat7 -Djava.io.tmpdir=/tmp/tomcat7-tomcat7-tmp org.apache.catalina.startup.Bootstrap start
```

I decided it might work to differentiate the Java processes by working directory, but I wasn’t sure if there was a good way to find the working directory. Through some Google searches I discovered the `pwdx` command. The `pwdx` command takes a list of pids as parameters and outputs a row with the pid and the working directory for each pid. The working directory doesn’t work for all situations, but I’ve found it generally gives a concise way of determining what a Java process is actually running. I’m certainly open to suggestions if anyone has a better idea.

Running the pwdx command for the output above — `sudo pwdx 41298` — leads to the following output. By combining this with the process name I can give the Java processes a more informative name when displayed in the Stackify website. This Java process would be displayed as `Java (/var/lib/tomcat7)`.

```text
41298: /var/lib/tomcat7
```