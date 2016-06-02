using UnityEngine;
using System.Collections;

public class Duck : MonoBehaviour
{
    //Rigidbody of the Gameobject
    [SerializeField] private Rigidbody2D rbSock;
    //Sprite of this bullet
    [SerializeField] private SpriteRenderer sprite;
    //Time left for explosion
    [SerializeField] private float explodeTime;
    //Speed of the bullet
    [SerializeField] private float speed;
    //Explosion object
    [SerializeField] private GameObject explosionObj;
    private bool isRight;
    private bool isLeft;
    private bool bounce;

    public int playernum;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        sprite.flipX = true;
        SoundManager.PlayAudioClip(AudioData.Duck);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
        SoundManager.PlayAudioClip(AudioData.Duck);
    }

    void FixedUpdate()
    {
        explodeTime--;

        if (isRight)
        {
            rbSock.AddForce(Vector2.right * speed, ForceMode2D.Impulse);
            isRight = false;
        }
        else if (isLeft)
        {
            rbSock.AddForce(Vector2.right * -speed, ForceMode2D.Impulse);
            isLeft = false;
        }

        if (bounce)
        {
            speed = 1;
            bounce = false;
        }

        if (explodeTime < 0)
        {
            //When the time is up instantiate our explosion obj and remove this obj
            Instantiate(explosionObj, transform.position, transform.rotation);
            Destroy(this.gameObject);
        }
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.ground))
            {
                bounce = true;
            }
        }
    }
}
