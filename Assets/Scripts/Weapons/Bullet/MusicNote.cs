using UnityEngine;
using System.Collections;

public class MusicNote : MonoBehaviour
{
    
    //Rigidbody of the Gameobject
    [SerializeField] private Rigidbody2D rbMusicNote;
    //Speed of the bullet
    [SerializeField] private float speed;
    //Amout of damage that the bullet will deal
    [SerializeField] private int damage;
    //Amount of Knockback the bullet will give
    [SerializeField] private float knockback;
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
            rbMusicNote.velocity = new Vector2(speed, speed / 3);
            yield return new WaitForSeconds(0.5f);
            rbMusicNote.velocity = new Vector2(speed, -speed / 3);
            yield return new WaitForSeconds(0.5f);
        }
    }

    void Hit(GameObject player)
    {
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(damage, true);
        //Give the player knockback
        PlayerMovement playerMovement = player.GetComponent<PlayerMovement>();
        Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        Vector2 currPosition = (rbMusicNote.position - rbPlayer.position).normalized;
        float xPos = currPosition.x * knockback;
        playerMovement.ApplyKnockback(xPos);
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.player))
            {
                Hit(coll.gameObject);
                speed = 0;
                isRight = false;
                isLeft = false;
                Destroy(this.gameObject);
            }

            else if (coll.gameObject.name == "MusicNoteBig(Clone)" || coll.gameObject.name == "MusicNoteSmall(Clone)")
            {
                MusicNote otherNote = coll.gameObject.GetComponent<MusicNote>();
                if (otherNote.playernum == playernum)
                    Physics2D.IgnoreCollision(GetComponent<Collider2D>(), otherNote.gameObject.GetComponent<Collider2D>());

                else
                {
                    isRight = false;
                    isLeft = false;
                    speed = 0;
                    rbMusicNote.isKinematic = true;
                    gameObject.AddComponent<Fade>();
                }
            }

            else
            {
                isRight = false;
                isLeft = false;
                speed = 0;
                rbMusicNote.isKinematic = true;
                gameObject.AddComponent<Fade>();
            }
        }
    }
}
