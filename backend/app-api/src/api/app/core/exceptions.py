"""异常处理模块。

使用框架的统一异常处理体系。
禁止自定义异常处理器 - 使用框架提供的 register_exception_handlers。
"""

from arksou.kernel.framework.base import register_exception_handlers

__all__ = ["register_exception_handlers"]
