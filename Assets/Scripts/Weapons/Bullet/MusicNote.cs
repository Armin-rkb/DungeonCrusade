using UnityEngine;
using System.Collections;

public class MusicNote : BaseBullet
{
    //The broken sprite.
    [SerializeField] private GameObject brokenBullet;
    private bool isRight;
    private bool isLeft;

    public int playernum;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        SoundManager.PlayAudioClip(AudioData.Hadouken);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
        SoundManager.PlayAudioClip(AudioData.Hadouken);
    }

    void Start()
    {
        playernum = this.gameObject.GetComponent<BulletNumber>().playernum;

        if (isRight)
            StartCoroutine(BulletBehavour(speed));
        else if (isLeft)
            StartCoroutine(BulletBehavour(-speed));
    }

    IEnumerator BulletBehavour(float speed)
    {
        while (true)
        {
            rbBullet.velocity = new Vector2(speed, speed / 3);
            yield return new WaitForSeconds(0.5f);
            rbBullet.velocity = new Vector2(speed, -speed / 3);
            yield return new WaitForSeconds(0.5f);
        }
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.player))
            {
                Hit(coll.gameObject);
                Instantiate(brokenBullet, transform.position, transform.rotation);
                Destroy(this.gameObject);
            }

            else if (coll.gameObject.name == "MusicNoteBig(Clone)" || coll.gameObject.name == "MusicNoteMedium(Clone)" || coll.gameObject.name == "MusicNoteSmall(Clone)")
            {
                MusicNote otherNote = coll.gameObject.GetComponent<MusicNote>();
                if (otherNote.playernum == playernum)
                    Physics2D.IgnoreCollision(GetComponent<Collider2D>(), otherNote.gameObject.GetComponent<Collider2D>());

                else
                {
                    Instantiate(brokenBullet, transform.position, transform.rotation);
                    Destroy(this.gameObject);
                }
            }

            else
            {
                Instantiate(brokenBullet, transform.position, transform.rotation);
                Destroy(this.gameObject);
            }
        }
    }
}
