---
layout: single
title: >-
  Selective setAccessible permissions using Byte Buddy and the Java
  SecurityManager
author_profile: true
date: 2016-07-19
tags:
  - java
  - security
---


The Java `SecurityManager` provides a lot of good permissions for restricted what untrusted code can access. The downside of the standard permissions is that many of them are too broad, making it hard to enable permissions around commonly used functionality without defeating the purpose of the restricted security. The permissions around reflections are one of these cases, where the permissions around the `setAccessible` reflections method is either all on or all off. It is possible to work around this default behavior, providing more selective fine-grained permissions, by using bytecode weaving. However, for any of this this to work the Java `SecurityManager` must be used along with loading the code that these permissions will be applied to from a separate jar, probably using a custom or at least isolated instance of a `URLClassLoader`. This is a prerequisite which has already been well documented by Will Sargent in his post [Self-Protecting Sandbox Using SecurityManager](https://tersesystems.com/2015/12/29/sandbox-experiment/) as well as my own example sandbox runtime environment [sandbox-runtime](https://github.com/johnlcox/sandbox-runtime).

The main permission in question around the `setAccessible` method is `ReflectPermission("suppressAccessChecks")`. When this permission is disabled it disallows changing the accessibility of fields, methods, and constructors. By default the `SecurityManager` is not enabled, which means all permission checks are disabled. Since this is the standard way Java is run, many common libraries, and even many alternative JVM language are dependent on being able to use reflection to access private fields and methods. If you do need to run code with a `SecurityManager`, then the `ReflectPermission("suppressAccessChecks")` permission defeats all security provided by the `SecurityManager`. Untrusted code can make use of `setAccessible` to work around and disable the `SecurityManager` entirely.

It may appear that the only two choices are between having a secure environment and disallowing untrusted code from using libraries or languages that require reflection, or allowing such access by having an unsecure environment. However, there is an alternative if you are willing to put in the work. Libraries like [Byte Buddy](https://github.com/raphw/byte-buddy) make it possible to replace methods of existing classes with new implementations, at runtime, through the use of a Java agent.

I have implemented a custom, more fine-grained, permission around access to the `setAccessible` method. In my examples I have chosen to use the code source or the `ClassLoader` as the determining factor; code that attempts to call `setAccessible` will only be granted permission if both itself and the class it is attempting to change the accessibility of are from the same class loader. In other words, this reflections method can only be used on classes from the same jar as the untrusted code; it cannot be used to access private fields of standard Java classes. This is just what I chose, as it fit best for the security settings I'm targeting. The determining factor could be setup in many different ways, including a package or class whitelist or blacklist.

The first piece that is needed is the new custom `Permission`. This permission uses the class loader of the caller and callee to determine whether permissions should be granted or not.

```java
public class UserSetAccessiblePermission extends Permission {
  private final ClassLoader loader;  

  public UserSetAccessiblePermission(ClassLoader loader) {
    super("userSetAccessible");

    this.loader = loader;
  }  

  @Override
  public boolean implies(Permission permission) {
    if (!(permission instanceof UserSetAccessiblePermission)) {
      return false;
    }

    UserSetAccessiblePermission that = (UserSetAccessiblePermission) permission;

    return that.loader == this.loader;
  }  

  // equals and hashCode omitted  

  @Override
  public String getActions() {
    return "";
  }
}
```

With the permission class in place, next we need a place to actually check the permission. This will happen in our custom implementation of the `setAccessible` method that will replace the standard `setAccessible` method. This can be done using Byte Buddy by creating our custom implementation as a static method with method parameters compatible with the standard `setAccessible`.

This class has a few interesting parts. It uses the `@This` annotation from Byte Buddy to get the object the original `setAccessible` method was called on. Access to this object can be used to retrieve the class loader of the object the accessibility is attempting to be changed on (callee). If the class loader is not an instance of the user class loader, then we just check the standard permission, but if it is a user class loader, then we continue with checking the custom permission. To check the permission we create an instance of the new permission with the class loader of the callee. If the caller has the same permission with the same instance of the user class loader, then the permissions is granted (a `SecurityException` is not thrown).

```java
public class AccessibleObjectStub {
  private final static Permission STANDARD_ACCESS_PERMISSION =
      new ReflectPermission("suppressAccessChecks");

  public static void setAccessible(@This AccessibleObject ao, boolean flag)
      throws SecurityException {
    SecurityManager sm = System.getSecurityManager();
    if (sm != null) {
      Permission permission = STANDARD_ACCESS_PERMISSION;
      if (isFromUserLoader(ao)) {
        try {
          permission = getUserAccessPermission(ao);
        } catch (Exception e) {
          // Ignore. Use standard permission.
        }
      }

      sm.checkPermission(permission);
    }
  }

  private static Permission getUserAccessPermission(AccessibleObject ao)
      throws IllegalAccessException, InvocationTargetException, InstantiationException,
      NoSuchMethodException, ClassNotFoundException {
    ClassLoader aoClassLoader = getAccessibleObjectLoader(ao);
    return new UserSetAccessiblePermission(aoClassLoader);
  }

  private static ClassLoader getAccessibleObjectLoader(AccessibleObject ao) {
    return AccessController.doPrivileged(new PrivilegedAction<ClassLoader>() {
      @Override
      public ClassLoader run() {
        if (ao instanceof Executable) {
          return ((Executable) ao).getDeclaringClass().getClassLoader();
        } else if (ao instanceof Field) {
          return ((Field) ao).getDeclaringClass().getClassLoader();
        }

        throw new IllegalStateException("Unknown AccessibleObject type: " + ao.getClass());
      }
    });
  }

  private static boolean isFromUserLoader(AccessibleObject ao) {
    ClassLoader loader = getAccessibleObjectLoader(ao);

    if (loader == null) {
      return false;
    }

    return UserClassLoaders.isUserClassLoader(loader);
  }
}
```

This gets us most of the way, but not quite all the way there. This replacement implementation only checks the permission, but we still need to actually modify the accessibility of the object after the permission is granted. This cannot be done directly by the replacement as the accessibility is controlled by a private field on the `AccessibleObject`. We can, however, accomplish this using the method chaining feature of Byte Buddy, which can be used to chain private methods. The private field on the `AccessibleObject` class is controlled by a private method named `setAccessible0` which we can chain as part of our Byte Buddy transformation using the `andThen` method.

First create a Byte Buddy type pool that includes the bootstrap classloader and your jar that includes the stubs.
```java
final TypePool bootstrapTypePool = TypePool.Default.of(
    new ClassFileLocator.Compound(
        new ClassFileLocator.ForJarFile(jarFile),
        ClassFileLocator.ForClassLoader.of(null)));
```

Next get the `AccessibleObject.setAccessible0` method using reflections.
```java
Method setAccessible0Method;
try {
  String setAccessible0MethodName = "setAccessible0";
  Class[] paramTypes = new Class[2];
  paramTypes[0] = AccessibleObject.class;
  paramTypes[1] = boolean.class;
  setAccessible0Method = AccessibleObject.class
      .getDeclaredMethod(setAccessible0MethodName, paramTypes);
} catch (NoSuchMethodException e) {
  throw new RuntimeException(e);
}
```

With those two pieces we can now build the Byte Buddy transformer to match on the `setAccessible` method and to delegate to the stub and chain to the `setAccessible0` method.
```java
AgentBuilder.Transformer transformer = new AgentBuilder.Transformer() {
  @Override
  public DynamicType.Builder<?> transform(
      DynamicType.Builder<?> builder,
      TypeDescription typeDescription, ClassLoader classLoader) {
    return builder.method(
        ElementMatchers.named("setAccessible")
            .and(ElementMatchers.takesArguments(boolean.class)))
        .intercept(MethodDelegation.to(
            bootstrapTypePool.describe(
                "com.leacox.sandbox.security.stub.java.lang.reflect.AccessibleObjectStub")
                .resolve())
            .andThen(MethodCall.invoke(setAccessible0Method).withThis().withAllArguments()));
  }
}
```

That will take care of replacing the default implementation of `setAccessible` with our custom implementation and chain to the `setAccessible0` method if permission is granted. If an exception occurs, for instance due to permissions not being granted, the chained transformation will exit early avoiding the call to actually change the accessibility.

The final step is to install Byte Buddy as a Java agent and actually perform the transformation. With a SecurityManager installed and this transformation executed, you can now run untrusted code with permissions to modify the accessibility of its own classes and methods, but not standard Java, your own runtime jar or other isolated code.

```java
Instrumentation instrumentation = ByteBuddyAgent.install();
// Append the jar containing the stub replacement to the bootstrap classpath
instrumentation.appendToBootstrapClassLoaderSearch(jarFile);

AgentBuilder agentBuilder = new AgentBuilder.Default()
       .disableClassFormatChanges()
       .with(AgentBuilder.RedefinitionStrategy.RETRANSFORMATION)
       .ignore(none()); // disable default ignores so we can transform Java classes
       .type(ElementMatchers.named("java.lang.reflect.AccessibleObject"))
       .transform(transformer)
       .installOnByteBuddyAgent();
```

In addition to everything above, you would also want to transform the other setAccessible method, `setAccessible(AccessibleObject[] array, boolean flag)`. For more information on this and a full implementation of a simple sandboxed runtime with this transformation have a look at my [sandbox-runtime](https://github.com/johnlcox/sandbox-runtime) on Github.
