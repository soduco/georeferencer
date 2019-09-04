package controllers

import javax.inject._
import play.api.Configuration
import play.api.http.HttpErrorHandler
import play.api.libs.json._
import play.api.mvc._
import play.api.libs.functional.syntax._

import sys.process._
import java.net.URL
import java.io.{BufferedWriter, File, FileWriter}

import utils.GitHelper
import org.eclipse.jgit.api.Git

/**
  * Frontend controller managing all static resource associate routes.
  * @param assets Assets controller reference.
  * @param cc Controller components reference.
  */
@Singleton
class FrontendController @Inject()(assets: Assets, errorHandler: HttpErrorHandler, config: Configuration, cc: ControllerComponents) extends AbstractController(cc) {

  def index: Action[AnyContent] = assets.at("index.html")

  def assetOrDefault(resource: String): Action[AnyContent] = if (resource.startsWith(config.get[String]("apiPrefix"))){
    Action.async(r => errorHandler.onClientError(r, NOT_FOUND, "Not found"))
  } else {
    if (resource.contains(".")) assets.at(resource) else index
  }

  def georeference = Action(parse.json) {
    implicit request => {
      case class ControlPoint(id: Int, x:Double, y: Double, lat: Double, long: Double)
      case class Body(url: String, points: Seq[ControlPoint])
      implicit val ControlPointReads: Reads[ControlPoint] = (
        (JsPath \ "pointid").read[Int] and
          (JsPath \ "x").read[Double] and
          (JsPath \ "y").read[Double] and
          (JsPath \ "lat").read[Double] and
          (JsPath \ "lng").read[Double]
        )(ControlPoint.apply _)
      implicit val BodyReads: Reads[Body] = (
        (JsPath \ "url").read[String] and
          (JsPath \ "points").read[Seq[ControlPoint]]
        )(Body.apply _)
      val bodyAsJson = Json.toJson(request.body).validate[Body]

      bodyAsJson match {
        case JsSuccess(body, _) => {
          val repositoryPath = "/tmp/mygitrepo"
          GitHelper.openOrCreateRepository(new File((repositoryPath))).map(repo => {
            val file = new File(repositoryPath, "georefmd.json")
            val bw = new BufferedWriter(new FileWriter(file))
            bw.write(Json.stringify(Json.toJson(request.body)))
            bw.close()
            val git = Git.wrap(repo)
            println(s"GIT object : $git")
            println(s"Repository ${git.getRepository}")
            git.add().addFilepattern("georefmd.json").call()
            git.commit().setMessage("Commit from FrontendController").call()
          })

          println("URL = " + body.url)
          println("CP = " + body.points)
          val cpsAsString = body.points.flatMap(cp=>Seq("-gcp", s"${cp.x} ${cp.y} ${cp.long} ${cp.lat}"))
          println("CP = " + cpsAsString.mkString(" "))
          val downloadCommand = s"wget ${body.url}full/full/0/native.jpg"
          println("downloadCommand = " + downloadCommand)
          val exitCodeDownload = downloadCommand.!
          println("Download = " + exitCodeDownload)
          val command = "gdal_translate "+cpsAsString.mkString(" ")+" -co TILED=YES -co COMPRESS=JPEG native.jpg translate.tif"
          println("COMMAND = " + command)
          val exitCodeTranslate = command.!
          println("EXIT CODE TRANSLATE = " + exitCodeTranslate)
          val warpCommand = "gdalwarp -of GTiff -t_srs EPSG:4326 -overwrite -co TILED=YES -co COMPRESS=JPEG translate.tif output.tif"
          val exitCodeWarp = warpCommand.!
          println("EXIT CODE WARP = " + exitCodeWarp)
          val tileCommand = "gdal2tiles.py --profile=mercator -z 1-13 output.tif ui/public/tiles"
          val exitCodeTile = tileCommand.!
          println("EXIT CODE TILE = " + exitCodeTile)
          Ok(Json.toJson(exitCodeTile))
        }
        case e: JsError => println(s"Errors: ${JsError toJson e}")
          Ok("Nope")
      }
//      val nativeImageUrl = bodyAsJson("url")+"full/full/0/native.jpg"
//      println("URL = " + nativeImageUrl)
//      case class ControlPoint(x:Double, y: Double, lat: Double, long: Double)
//      val controlPoints = bodyAsJson("points").validate[JsArray[ControlPoint]]
    }
  }
}