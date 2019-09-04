package utils

import java.io.File

import org.eclipse.jgit.api.Git
import org.eclipse.jgit.lib.Repository
import org.eclipse.jgit.storage.file.FileRepositoryBuilder

import scala.util.{Failure, Try}

object GitHelper {

  def openOrCreateRepository(gitDir: File) = {
    Try {
      if(gitDir.exists() || gitDir.mkdirs()){
        val builder = new FileRepositoryBuilder()
        builder.addCeilingDirectory(gitDir).findGitDir(gitDir)
        builder.getGitDir match {
          case null => Git.init().setDirectory(gitDir).call().getRepository()
          case x => builder.setMustExist(true).build()
        }
      }else{
        throw new Exception(s"Could not create a GIT repository in $gitDir.")
      }
    }
  }



}
