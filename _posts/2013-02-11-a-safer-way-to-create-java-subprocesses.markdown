---
layout: single
slug: a-safer-way-to-create-java-subprocesses
title: A Safer Way To Create Java Subprocesses
author_profile: true
date: 2013-02-11
tags:
- java
---

If you have ever had to start a subprocess from a Java application, then you likely know how painful it can be to use the Process class via Runtime.exec or ProcessBuilder. There are numerous posts on [stackoverflow](http://stackoverflow.com/search?tab=votes&q=%5bjava%5d%20processbuilder) as well as a multitude of blog posts on the correct usage of the Process class. I found a blog post on the [five common pitfalls of the Process class](http://kylecartmell.com/?p=9) to be the most helpful when I began using subprocesses. Being aware of the pitfalls helps, but if you are running a lot of subprocesses, the additional code needed in each instance can become tedious and you increase the odds of making a mistake. I ended up creating the [process-warden](https://github.com/johnlcox/process-warden) library for a safer way to create Java subprocesses that is reusable.

I make use of subprocesses in the [Stackify](http://www.stackify.com/) monitoring agent for executing shell commands as well as for updating a running agent -- which I hope to write a separate blog post on at some point. It quickly became clear that having a common way of providing a timeout for the Process.waitFor method and making sure that the streams are closed would be very beneficial. I created the [FinalizedProcess](https://github.com/johnlcox/process-warden/blob/master/src/main/java/com/leacox/process/FinalizedProcess.java) and [FinalizedProcessBuilder](https://github.com/johnlcox/process-warden/blob/master/src/main/java/com/leacox/process/FinalizedProcessBuilder.java) classes that wrap the usage of the Process class and take care of many of the common pitfalls.

FinalizedProcess implements Closable and in its close method it makes sure that all of the subprocess streams are closed as well as optionally destroying the subprocess. It also has a waitFor method that takes a timeout in milliseconds instead of a no parameter waitFor. If the subprocess execution takes longer than the timeout, then an InterruptedException will be thrown and the interrupted flag will be cleared when InterruptedExceptions are thrown. With these additions three of the five common pitfalls are remedied.

For the two remaining pitfalls the problem of process grandchildren not being kill when a subprocess is killed cannot be remedied via code, so that will still require user knowledge to avoid. As for the prompt consumption of subprocess output, I didn't have an immediate need for discarding the output, so the initial version of process-warden doesn't provide any functionality for consuming the output. In a future release I hope to add a class that will silently consume the output and error streams along with a method on FinalizedProcessBuilder to enable the silent consumption.

So how do you use process-warden? It's easy. 

Add it to your maven project:
```xml
<dependency>
	<groupId>com.leacox.process</groupId>
	<artifactId>process−warden<artifactId>
	<version>1.0.0</version>
</dependency>
```

Use FinalizedProcessBuilder to create a FinalizedProcess to execute:
```java
// With Java 7
FinalizedProcessBuilder pb = new FinalizedProcessBuilder("myCommand", "myArg");
try (FinalizedProcess process = pb.start()) {
  int returnVal = process.waitFor(5000); // 5 second timeout
}

// With Java 6
FinalizedProcessBuilder pb = new FinalizedProcessBuilder("myCommand", "myArg");
FinalizedProcess process = pb.start();
try {
  int returnVal = process.waitFor(5000); // 5 second timeout
} finally {
  process.close();
}
```

If you are currently using Process and ProcessBuilder, give process-warden a shot. It should help simplify your code. I appreciate any feedback or suggestions. Feel free to log issues or fork the [project](https://github.com/johnlcox/process-warden) on github.
